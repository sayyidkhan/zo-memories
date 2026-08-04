import { zValidator } from "@hono/zod-validator";
import {
  createAlbumSchema,
  createSpaceSchema,
  inviteMemberSchema,
  type Album,
  type Invitation,
  type Member,
  type MomentObject,
  type ObjectKind,
  type Space,
} from "@zo-moments/types";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { createAuth, type AuthSession } from "./auth";
import { createRepositories, type Repositories } from "./repositories";
import type { BlobStore } from "./storage/blob-store";

interface AppBindings {
  Variables: {
    user: AuthSession["user"] | null;
    session: AuthSession["session"] | null;
  };
}

export interface CreateAppOptions {
  store: BlobStore;
  log?: boolean;
}

function now(): string {
  return new Date().toISOString();
}

function id(): string {
  return crypto.randomUUID();
}

function objectKind(mimeType: string): ObjectKind {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 160) || "memory";
}

function contentDisposition(name: string, download: boolean): string {
  const fallback = safeFileName(name).replace(/["\\]/g, "-");
  const encoded = encodeURIComponent(name);
  return `${download ? "attachment" : "inline"}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function parseRange(header: string | undefined, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match) return null;
  const startText = match[1] ?? "";
  const endText = match[2] ?? "";
  if (!startText && !endText) return null;

  const start = startText ? Number(startText) : Math.max(0, size - Number(endText));
  const end = endText && startText ? Math.min(size - 1, Number(endText)) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
    return null;
  }
  return { start, end };
}

async function acceptPendingInvitations(
  repositories: Repositories,
  user: AuthSession["user"],
): Promise<void> {
  const pending = await repositories.invitations.find(
    (invitation) => invitation.status === "pending" && invitation.email === user.email.toLowerCase(),
  );

  for (const invitation of pending) {
    const existing = await repositories.members.findOne(
      (member) => member.spaceId === invitation.spaceId && member.userId === user.id,
    );
    if (!existing) {
      await repositories.members.put({
        id: id(),
        spaceId: invitation.spaceId,
        userId: user.id,
        email: user.email.toLowerCase(),
        name: user.name,
        role: "member",
        joinedAt: now(),
      });
    }
    await repositories.invitations.put({ ...invitation, status: "accepted", acceptedAt: now() });
  }
}

async function requireMember(
  repositories: Repositories,
  spaceId: string,
  userId: string,
): Promise<Member> {
  const member = await repositories.members.findOne(
    (candidate) => candidate.spaceId === spaceId && candidate.userId === userId,
  );
  if (!member) throw new HTTPException(403, { message: "You do not have access to this space" });
  return member;
}

async function requireOwner(
  repositories: Repositories,
  spaceId: string,
  userId: string,
): Promise<Member> {
  const member = await requireMember(repositories, spaceId, userId);
  if (member.role !== "owner") throw new HTTPException(403, { message: "Only the space owner can do that" });
  return member;
}

async function forwardAuth(request: Request, path: string, auth: ReturnType<typeof createAuth>) {
  const url = new URL(request.url);
  url.pathname = path;
  return auth.handler(
    new Request(url, {
      method: request.method,
      headers: request.headers,
      ...(request.method === "GET" || request.method === "HEAD" ? {} : { body: request.body }),
    }),
  );
}

export function createApp({ store, log = process.env.NODE_ENV !== "test" }: CreateAppOptions) {
  const app = new Hono<AppBindings>();
  const repositories = createRepositories(store);
  const auth = createAuth(store);

  if (log) app.use("*", logger());
  app.use("*", secureHeaders());

  app.get("/health", async (c) => {
    await store.health();
    return c.json({ status: "ok", storage: process.env.STORAGE_DRIVER ?? "s3" });
  });

  app.post("/auth/register", (c) => forwardAuth(c.req.raw, "/auth/sign-up/email", auth));
  app.post("/auth/login", (c) => forwardAuth(c.req.raw, "/auth/sign-in/email", auth));
  app.post("/auth/logout", (c) => forwardAuth(c.req.raw, "/auth/sign-out", auth));
  app.get("/auth/me", (c) => forwardAuth(c.req.raw, "/auth/get-session", auth));
  app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

  app.use("/api/*", async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new HTTPException(401, { message: "Sign in to continue" });
    c.set("user", session.user);
    c.set("session", session.session);
    await acceptPendingInvitations(repositories, session.user);
    await next();
  });

  app.get("/api/spaces", async (c) => {
    const user = c.get("user")!;
    const memberships = await repositories.members.find((member) => member.userId === user.id);
    const spaces = await Promise.all(
      memberships.map(async (membership) => {
        const space = await repositories.spaces.get(membership.spaceId);
        if (!space) return null;
        const [members, objects] = await Promise.all([
          repositories.members.find((member) => member.spaceId === space.id),
          repositories.objects.find((object) => object.spaceId === space.id),
        ]);
        const sorted = objects.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
        return {
          ...space,
          role: membership.role,
          memberCount: members.length,
          objectCount: objects.length,
          latestObject: sorted[0] ?? null,
        };
      }),
    );
    return c.json({ spaces: spaces.filter((space) => space !== null).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
  });

  app.post("/api/spaces", zValidator("json", createSpaceSchema), async (c) => {
    const user = c.get("user")!;
    const input = c.req.valid("json");
    const timestamp = now();
    const space: Space = {
      id: id(),
      name: input.name,
      description: input.description || null,
      ownerId: user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await repositories.spaces.put(space);
    await repositories.members.put({
      id: id(),
      spaceId: space.id,
      userId: user.id,
      email: user.email.toLowerCase(),
      name: user.name,
      role: "owner",
      joinedAt: timestamp,
    });
    return c.json({ space }, 201);
  });

  app.get("/api/spaces/:spaceId", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    const membership = await requireMember(repositories, spaceId, user.id);
    const space = await repositories.spaces.get(spaceId);
    if (!space) throw new HTTPException(404, { message: "Space not found" });
    const [members, invitations, albums] = await Promise.all([
      repositories.members.find((member) => member.spaceId === spaceId),
      repositories.invitations.find((invitation) => invitation.spaceId === spaceId),
      repositories.albums.find((album) => album.spaceId === spaceId),
    ]);
    return c.json({
      space,
      membership,
      members: members.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
      invitations: invitations.filter((invitation) => invitation.status === "pending"),
      albums: albums.sort((a, b) => a.name.localeCompare(b.name)),
    });
  });

  app.delete("/api/spaces/:spaceId", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireOwner(repositories, spaceId, user.id);
    const objects = await repositories.objects.find((object) => object.spaceId === spaceId);
    await Promise.all(objects.map((object) => store.delete(object.storageKey)));
    await Promise.all([
      repositories.objects.deleteWhere((object) => object.spaceId === spaceId),
      repositories.albums.deleteWhere((album) => album.spaceId === spaceId),
      repositories.invitations.deleteWhere((invitation) => invitation.spaceId === spaceId),
      repositories.members.deleteWhere((member) => member.spaceId === spaceId),
      repositories.spaces.delete(spaceId),
    ]);
    return c.body(null, 204);
  });

  app.post("/api/spaces/:spaceId/invite", zValidator("json", inviteMemberSchema), async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireOwner(repositories, spaceId, user.id);
    const { email } = c.req.valid("json");
    const existingMember = await repositories.members.findOne(
      (member) => member.spaceId === spaceId && member.email === email,
    );
    if (existingMember) throw new HTTPException(409, { message: "That person is already a member" });
    const existingInvite = await repositories.invitations.findOne(
      (invitation) => invitation.spaceId === spaceId && invitation.email === email && invitation.status === "pending",
    );
    if (existingInvite) return c.json({ invitation: existingInvite });
    const invitation: Invitation = {
      id: id(),
      spaceId,
      email,
      role: "member",
      invitedBy: user.id,
      status: "pending",
      createdAt: now(),
      acceptedAt: null,
    };
    await repositories.invitations.put(invitation);
    return c.json({ invitation }, 201);
  });

  app.get("/api/spaces/:spaceId/members", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const [members, invitations] = await Promise.all([
      repositories.members.find((member) => member.spaceId === spaceId),
      repositories.invitations.find((invitation) => invitation.spaceId === spaceId && invitation.status === "pending"),
    ]);
    return c.json({ members, invitations });
  });

  app.delete("/api/spaces/:spaceId/members/:userId", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    const memberUserId = c.req.param("userId");
    await requireOwner(repositories, spaceId, user.id);
    const member = await repositories.members.findOne(
      (candidate) => candidate.spaceId === spaceId && candidate.userId === memberUserId,
    );
    if (!member) throw new HTTPException(404, { message: "Member not found" });
    if (member.role === "owner") throw new HTTPException(400, { message: "The owner cannot be removed" });
    await repositories.members.delete(member.id);
    return c.body(null, 204);
  });

  app.get("/api/spaces/:spaceId/albums", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const albums = await repositories.albums.find((album) => album.spaceId === spaceId);
    return c.json({ albums: albums.sort((a, b) => a.name.localeCompare(b.name)) });
  });

  app.post("/api/spaces/:spaceId/albums", zValidator("json", createAlbumSchema), async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const input = c.req.valid("json");
    const timestamp = now();
    const album: Album = {
      id: id(),
      spaceId,
      name: input.name,
      description: input.description || null,
      createdBy: user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await repositories.albums.put(album);
    return c.json({ album }, 201);
  });

  app.delete("/api/spaces/:spaceId/albums/:albumId", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    const albumId = c.req.param("albumId");
    const album = await repositories.albums.get(albumId);
    if (!album || album.spaceId !== spaceId) throw new HTTPException(404, { message: "Album not found" });
    const membership = await requireMember(repositories, spaceId, user.id);
    if (membership.role !== "owner" && album.createdBy !== user.id) {
      throw new HTTPException(403, { message: "Only the album creator or space owner can delete it" });
    }
    const objects = await repositories.objects.find((object) => object.spaceId === spaceId && object.albumId === albumId);
    await Promise.all(objects.map((object) => repositories.objects.put({ ...object, albumId: null })));
    await repositories.albums.delete(albumId);
    return c.body(null, 204);
  });

  app.get("/api/spaces/:spaceId/objects", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const albumId = c.req.query("albumId");
    const search = c.req.query("search")?.trim().toLowerCase();
    const objects = await repositories.objects.find((object) => {
      if (object.spaceId !== spaceId) return false;
      if (albumId && object.albumId !== albumId) return false;
      if (search && !`${object.name} ${object.caption ?? ""} ${object.occurredAt}`.toLowerCase().includes(search)) return false;
      return true;
    });
    return c.json({ objects: objects.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)) });
  });

  app.post("/api/spaces/:spaceId/objects", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throw new HTTPException(400, { message: "Choose a file to upload" });
    const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 100 * 1024 * 1024);
    if (file.size <= 0) throw new HTTPException(400, { message: "The selected file is empty" });
    if (file.size > maxBytes) throw new HTTPException(413, { message: `Uploads are limited to ${Math.round(maxBytes / 1024 / 1024)} MB` });

    const albumId = typeof body.albumId === "string" && body.albumId ? body.albumId : null;
    if (albumId) {
      const album = await repositories.albums.get(albumId);
      if (!album || album.spaceId !== spaceId) throw new HTTPException(400, { message: "The selected album does not exist" });
    }

    const objectId = id();
    const storageKey = `zo-moments/media/${spaceId}/${objectId}/${safeFileName(file.name)}`;
    const createdAt = now();
    const occurredInput = typeof body.occurredAt === "string" ? new Date(body.occurredAt) : null;
    const occurredAt = occurredInput && !Number.isNaN(occurredInput.getTime()) ? occurredInput.toISOString() : createdAt;
    const object: MomentObject = {
      id: objectId,
      spaceId,
      albumId,
      storageKey,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      kind: objectKind(file.type),
      caption: typeof body.caption === "string" && body.caption.trim() ? body.caption.trim().slice(0, 500) : null,
      uploadedBy: user.id,
      createdAt,
      occurredAt,
    };

    await store.put(storageKey, file, { contentType: object.mimeType });
    try {
      await repositories.objects.put(object);
      const space = await repositories.spaces.get(spaceId);
      if (space) await repositories.spaces.put({ ...space, updatedAt: createdAt });
    } catch (error) {
      await store.delete(storageKey);
      throw error;
    }
    return c.json({ object }, 201);
  });

  app.get("/api/spaces/:spaceId/objects/:objectId", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const object = await repositories.objects.get(c.req.param("objectId"));
    if (!object || object.spaceId !== spaceId) throw new HTTPException(404, { message: "Memory not found" });
    const blob = await store.get(object.storageKey);
    if (!blob) throw new HTTPException(404, { message: "Stored object not found" });

    const range = parseRange(c.req.header("range"), object.size);
    const download = c.req.query("download") === "1";
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": contentDisposition(object.name, download),
      "Content-Type": object.mimeType,
    });
    if (range) {
      const chunk = blob.slice(range.start, range.end + 1, object.mimeType);
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${object.size}`);
      headers.set("Content-Length", String(range.end - range.start + 1));
      return new Response(chunk, { status: 206, headers });
    }
    headers.set("Content-Length", String(object.size));
    return new Response(blob, { headers });
  });

  app.delete("/api/spaces/:spaceId/objects/:objectId", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    const membership = await requireMember(repositories, spaceId, user.id);
    const object = await repositories.objects.get(c.req.param("objectId"));
    if (!object || object.spaceId !== spaceId) throw new HTTPException(404, { message: "Memory not found" });
    if (membership.role !== "owner" && object.uploadedBy !== user.id) {
      throw new HTTPException(403, { message: "Only the uploader or space owner can delete this memory" });
    }
    await store.delete(object.storageKey);
    await repositories.objects.delete(object.id);
    return c.body(null, 204);
  });

  app.notFound((c) => c.json({ error: "Not found", code: "NOT_FOUND" }, 404));
  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: error.message, code: `HTTP_${error.status}` }, error.status);
    }
    console.error(error);
    return c.json({ error: "Something went wrong", code: "INTERNAL_ERROR" }, 500);
  });

  return { app, auth, repositories };
}
