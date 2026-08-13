import { zValidator } from "@hono/zod-validator";
import {
  changePasswordSchema,
  createAlbumSchema,
  createShareInvitationSchema,
  createSpaceSchema,
  createStorySchema,
  demoLoginSchema,
  inviteMemberSchema,
  suggestStoryStyleSchema,
  updateDemoModeSchema,
  updateAccountStatusSchema,
  updateAdminRoleSchema,
  updateProfileSchema,
  type Album,
  type Avatar,
  type Invitation,
  type Member,
  type MomentObject,
  type ObjectKind,
  type ShareInvitation,
  type Space,
  type Story,
  type StoryStyle,
} from "@zo-moments/types";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { createAuth, type AuthSession } from "./auth";
import { createRepositories, type Repositories } from "./repositories";
import type { BlobStore } from "./storage/blob-store";
import { JsonCollection } from "./storage/json-collection";

interface AuthUserRecord {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: string | Date;
}

interface DemoModeRecord {
  id: "demo-mode";
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

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

function invitationToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const SHARE_INVITATION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const DEMO_MODE_ID = "demo-mode";
const DEMO_SPACE_ID = "demo-space";
const DEMO_ALBUM_ID = "demo-album-journeys";
const DEMO_STORY_ID = "demo-story-year-in-motion";
const DEMO_PERSONAS = [
  { id: "maya", name: "Maya Chen", email: "demo-maya@zo-moments.example", role: "owner", description: "Plans the journeys" },
  { id: "leo", name: "Leo Tan", email: "demo-leo@zo-moments.example", role: "member", description: "Captures the details" },
  { id: "sam", name: "Sam Rivera", email: "demo-sam@zo-moments.example", role: "member", description: "Keeps the stories" },
] as const;
const LEGACY_DEMO_USER_EMAIL = "demo@zo-moments.example";

function demoStory(ownerId: string): Story {
  return {
    id: DEMO_STORY_ID,
    spaceId: DEMO_SPACE_ID,
    title: "The year we kept moving",
    location: "From Tokyo to the Pacific Coast",
    opening: "It started before sunrise at an airport and became a year measured in missed trains, rain-lit streets, cold swims, and dinners that ran past midnight. None of us planned a grand adventure. We just kept saying yes to the next small detour.",
    momentIds: ["demo-moment-airport", "demo-moment-train", "demo-moment-snow-cabin", "demo-moment-coast", "demo-moment-lisbon", "demo-moment-breakfast", "demo-moment-waterfall", "demo-moment-tokyo", "demo-moment-market", "demo-moment-desert", "demo-moment-ferry", "demo-moment-mountain", "demo-moment-lake", "demo-moment-marrakech", "demo-moment-pottery", "demo-moment-campfire", "demo-moment-terrace", "demo-moment-journal"],
    style: "cinematic",
    styleSource: "auto",
    styleRationale: "A long, photo-led journey across several places and seasons.",
    createdBy: ownerId,
    createdAt: "2026-08-04T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
  };
}

function normaliseStory(story: Story): Story {
  return {
    ...story,
    style: story.style ?? "classic",
    styleSource: story.styleSource ?? "auto",
    styleRationale: story.styleRationale ?? null,
  };
}

function recommendStoryStyle(moments: MomentObject[]): { style: StoryStyle; rationale: string } {
  const photos = moments.filter((moment) => moment.kind === "photo").length;
  const mixedMedia = new Set(moments.map((moment) => moment.kind)).size > 1;
  const captioned = moments.filter((moment) => moment.caption?.trim()).length;
  const dates = moments.map((moment) => Date.parse(moment.occurredAt)).filter(Number.isFinite).sort((a, b) => a - b);
  const spanDays = dates.length > 1 ? ((dates.at(-1) ?? 0) - (dates[0] ?? 0)) / 86_400_000 : 0;
  if (mixedMedia) return { style: "scrapbook", rationale: "Mixed photos, recordings, and documents suit a layered keepsake layout." };
  if (photos >= 10 || spanDays >= 45) return { style: "cinematic", rationale: "A larger journey across time benefits from an immersive, spacious narrative." };
  if (photos >= 6 && spanDays <= 7) return { style: "flipbook", rationale: "A tightly sequenced set of photos works well as a page-by-page flipbook." };
  if (photos >= 4 && captioned >= Math.ceil(moments.length * 0.75)) return { style: "comic", rationale: "Strong captions and visual beats can read naturally as comic panels." };
  return { style: "classic", rationale: "A balanced editorial layout keeps the moments and their context easy to follow." };
}

const storyStyleRationales: Record<StoryStyle, string> = {
  classic: "A balanced editorial layout keeps the moments and their context easy to follow.",
  flipbook: "A page-by-page sequence gives each selected moment room to land.",
  comic: "Strong visual beats and captions can read naturally as a panelled story.",
  scrapbook: "A layered keepsake layout works well for varied moments and personal details.",
  cinematic: "An immersive, spacious narrative gives a larger journey room to unfold.",
};

async function aiStoryStyle(moments: MomentObject[]): Promise<{ style: StoryStyle; rationale: string } | null> {
  if (process.env.NODE_ENV === "test") return null;
  const token = process.env.ZO_CLIENT_IDENTITY_TOKEN;
  if (!token) return null;
  const choices: StoryStyle[] = ["classic", "flipbook", "comic", "scrapbook", "cinematic"];
  const inventory = moments.map(({ name, caption, kind, occurredAt }) => ({ name, caption, kind, occurredAt }));
  try {
    const response = await fetch("https://api.zo.computer/zo/ask", {
      method: "POST",
      headers: { authorization: token, "content-type": "application/json" },
      body: JSON.stringify({
        input: `Recommend one presentation style for this private memory story. Choose only classic, flipbook, comic, scrapbook, or cinematic. Base the choice on sequence, media mix, captions, and time span. Do not invent image contents.\n\nMoments:\n${JSON.stringify(inventory)}`,
        model_name: process.env.ZO_STORY_MODEL ?? "byok:6e9e8a54-d7f5-4a81-8265-9072bf996b61",
        output_format: {
          type: "object",
          properties: { style: { type: "string", enum: choices }, rationale: { type: "string" } },
          required: ["style", "rationale"],
          additionalProperties: false,
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) return null;
    const body = await response.json() as { output?: { style?: string; rationale?: string } };
    const style = body.output?.style;
    if (!style || !choices.includes(style as StoryStyle)) return null;
    const resolvedStyle = style as StoryStyle;
    const rationale = body.output?.rationale?.trim() || storyStyleRationales[resolvedStyle];
    return { style: resolvedStyle, rationale: rationale.slice(0, 300) };
  } catch {
    return null;
  }
}

function publicDemoPersonas() {
  return DEMO_PERSONAS.map(({ id, name, role, description }) => ({ id, name, role, description }));
}

function shareInvitationStatus(invitation: ShareInvitation): ShareInvitation["status"] | "expired" {
  if (invitation.status === "active" && Date.parse(invitation.expiresAt) <= Date.now()) return "expired";
  return invitation.status;
}

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isBootstrapAdmin(email: string): boolean {
  return adminEmails().has(email.toLowerCase());
}

async function promoteBootstrapAdmin(
  users: JsonCollection<AuthUserRecord>,
  user: AuthSession["user"],
): Promise<boolean> {
  if (!isBootstrapAdmin(user.email) || user.role === "admin") return false;
  const record = await users.get(user.id);
  if (!record) return false;
  await users.put({ ...record, role: "admin" });
  return true;
}

function requireAdmin(user: AuthSession["user"]): void {
  if (user.role !== "admin") throw new HTTPException(403, { message: "Administrator access is required" });
}

function requireSuperAdmin(user: AuthSession["user"]): void {
  if (!isBootstrapAdmin(user.email)) throw new HTTPException(403, { message: "Super administrator access is required" });
}

function isDemoUser(user: Pick<AuthUserRecord, "email">): boolean {
  const email = user.email.toLowerCase();
  return email === LEGACY_DEMO_USER_EMAIL || DEMO_PERSONAS.some((persona) => persona.email === email);
}

function requirePermanentAccount(user: AuthSession["user"]): void {
  if (isDemoUser(user)) throw new HTTPException(403, { message: "Demo account details cannot be changed" });
}

async function demoPassword(personaId: string): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new HTTPException(503, { message: "Demo access is not configured" });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`zo-moments-demo:${personaId}:${secret}`));
  return `Demo-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function ensureDemoWorkspace(
  repositories: Repositories,
  store: BlobStore,
  users: Map<string, AuthUserRecord>,
): Promise<void> {
  const timestamp = now();
  const owner = users.get("maya");
  if (!owner) throw new HTTPException(503, { message: "Demo access is not configured" });
  await repositories.spaces.put({
    id: DEMO_SPACE_ID,
    name: "Our year in motion",
    description: "A year on the move, told by three friends.",
    ownerId: owner.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  await repositories.members.delete("demo-member");
  await Promise.all(DEMO_PERSONAS.map(async (persona, index) => {
    const user = users.get(persona.id);
    if (!user) return;
    await repositories.members.put({
      id: `demo-member-${persona.id}`,
      spaceId: DEMO_SPACE_ID,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: persona.role,
      joinedAt: new Date(Date.parse(timestamp) + index).toISOString(),
    });
  }));
  await repositories.albums.put({
    id: DEMO_ALBUM_ID,
    spaceId: DEMO_SPACE_ID,
    name: "Journeys",
    description: "Places we still talk about.",
    createdBy: owner.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const samples = [
    { id: "demo-moment-airport", personaId: "leo", file: "airport-dawn.webp", name: "airport-before-dawn.webp", caption: "The glamorous 5am departure", occurredAt: "2026-01-04T21:20:00.000Z" },
    { id: "demo-moment-train", personaId: "sam", file: "train-window.webp", name: "somewhere-between-stations.webp", caption: "Somewhere between stations", occurredAt: "2026-01-06T00:35:00.000Z" },
    { id: "demo-moment-snow-cabin", personaId: "sam", file: "snow-cabin.webp", name: "snow-at-the-door.webp", caption: "We brought half the mountain inside", occurredAt: "2026-01-20T18:15:00.000Z" },
    { id: "demo-moment-coast", personaId: "maya", file: "coastal-roadtrip.webp", name: "pacific-coast.webp", caption: "Windows down on the Pacific Coast", occurredAt: "2026-02-14T08:30:00.000Z" },
    { id: "demo-moment-lisbon", personaId: "maya", file: "lisbon-tram.webp", name: "last-tram-in-lisbon.webp", caption: "We nearly missed the last tram", occurredAt: "2026-02-20T17:25:00.000Z" },
    { id: "demo-moment-breakfast", personaId: "leo", file: "cabin-breakfast.webp", name: "pancake-incident.webp", caption: "The great pancake incident", occurredAt: "2026-03-01T08:05:00.000Z" },
    { id: "demo-moment-waterfall", personaId: "sam", file: "iceland-waterfall.webp", name: "waterfall-picnic.webp", caption: "Lunch with the waterfall doing all the talking", occurredAt: "2026-03-19T12:10:00.000Z" },
    { id: "demo-moment-tokyo", personaId: "leo", file: "tokyo-evening.webp", name: "tokyo-after-rain.webp", caption: "Tokyo glowing after the rain", occurredAt: "2026-04-09T12:15:00.000Z" },
    { id: "demo-moment-market", personaId: "sam", file: "osaka-night-market.webp", name: "one-more-skewer.webp", caption: "One more skewer before we go", occurredAt: "2026-04-10T13:40:00.000Z" },
    { id: "demo-moment-desert", personaId: "maya", file: "desert-roadtrip.webp", name: "the-map-was-upside-down.webp", caption: "The map was upside down the whole time", occurredAt: "2026-05-02T07:45:00.000Z" },
    { id: "demo-moment-ferry", personaId: "maya", file: "island-ferry.webp", name: "windy-ferry-selfie.webp", caption: "Wind: 1, our hair: 0", occurredAt: "2026-05-17T04:25:00.000Z" },
    { id: "demo-moment-mountain", personaId: "sam", file: "mountain-morning.webp", name: "first-light.webp", caption: "First light above the ridge", occurredAt: "2026-06-22T05:45:00.000Z" },
    { id: "demo-moment-lake", personaId: "leo", file: "alpine-lake.webp", name: "coldest-swim.webp", caption: "Colder than anyone admitted", occurredAt: "2026-06-23T11:10:00.000Z" },
    { id: "demo-moment-marrakech", personaId: "maya", file: "marrakech-rooftop.webp", name: "sunset-on-the-roof.webp", caption: "We passed the last bowl as the city lit up", occurredAt: "2026-07-02T19:35:00.000Z" },
    { id: "demo-moment-pottery", personaId: "sam", file: "pottery-class.webp", name: "still-technically-a-vase.webp", caption: "Still technically a vase", occurredAt: "2026-07-12T07:50:00.000Z" },
    { id: "demo-moment-campfire", personaId: "leo", file: "beach-campfire.webp", name: "last-fire-before-home.webp", caption: "The last fire before home", occurredAt: "2026-07-29T19:15:00.000Z" },
    { id: "demo-moment-terrace", personaId: "maya", file: "terrace-dinner.webp", name: "tuscany-dinner.webp", caption: "Dinner that lasted until midnight", occurredAt: "2026-08-03T18:40:00.000Z" },
    { id: "demo-moment-journal", personaId: "leo", file: "lakeside-journal.webp", name: "the-route-we-kept.webp", caption: "Every detour finally made it onto the page", occurredAt: "2026-08-04T06:30:00.000Z" },
  ];
  for (const sample of samples) {
    const file = Bun.file(`./apps/web/public/images/moments/${sample.file}`);
    if (!(await file.exists())) continue;
    const storageKey = `zo-moments/media/${DEMO_SPACE_ID}/${sample.id}/${sample.name}`;
    await store.put(storageKey, file, { contentType: "image/webp" });
    await repositories.objects.put({
      id: sample.id,
      spaceId: DEMO_SPACE_ID,
      albumId: DEMO_ALBUM_ID,
      storageKey,
      name: sample.name,
      mimeType: "image/webp",
      size: file.size,
      kind: "photo",
      caption: sample.caption,
      uploadedBy: users.get(sample.personaId)?.id ?? owner.id,
      createdAt: sample.occurredAt,
      occurredAt: sample.occurredAt,
    });
  }
  await repositories.stories.put(demoStory(owner.id));
}

function detectedImage(bytes: Uint8Array): { mimeType: string; extension: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 6) {
    const header = new TextDecoder().decode(bytes.slice(0, 6));
    if (header === "GIF87a" || header === "GIF89a") return { mimeType: "image/gif", extension: "gif" };
  }
  return null;
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

async function forwardAuthJson(
  request: Request,
  path: string,
  auth: ReturnType<typeof createAuth>,
  body: unknown,
) {
  const url = new URL(request.url);
  url.pathname = path;
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return auth.handler(new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }));
}

export function createApp({ store, log = process.env.NODE_ENV !== "test" }: CreateAppOptions) {
  const app = new Hono<AppBindings>();
  const repositories = createRepositories(store);
  const auth = createAuth(store);
  const authUsers = new JsonCollection<AuthUserRecord>(store, "auth/user");
  const demoMode = new JsonCollection<DemoModeRecord>(store, "app-settings");

  if (log) app.use("*", logger());
  app.use("*", secureHeaders());

  app.get("/health", async (c) => {
    await store.health();
    return c.json({ status: "ok", storage: process.env.STORAGE_DRIVER ?? (process.env.NODE_ENV === "production" ? "filesystem" : "memory") });
  });

  app.get("/public/demo-mode", async (c) => {
    const setting = await demoMode.get(DEMO_MODE_ID);
    return c.json({
      enabled: setting?.enabled ?? false,
      updatedAt: setting?.updatedAt ?? null,
      updatedBy: null,
      personas: publicDemoPersonas(),
    });
  });

  app.get("/public/invitations/:token", async (c) => {
    const invitation = await repositories.shareInvitations.findOne(
      (candidate) => candidate.token === c.req.param("token"),
    );
    if (!invitation) throw new HTTPException(404, { message: "Invitation not found" });
    const status = shareInvitationStatus(invitation);
    if (status !== "active") throw new HTTPException(410, { message: "This invitation is no longer available" });
    const [space, inviter] = await Promise.all([
      repositories.spaces.get(invitation.spaceId),
      repositories.members.findOne(
        (member) => member.spaceId === invitation.spaceId && member.userId === invitation.invitedBy,
      ),
    ]);
    if (!space) throw new HTTPException(410, { message: "This shared space is no longer available" });
    return c.json({
      invitation: {
        spaceId: space.id,
        spaceName: space.name,
        inviterName: inviter?.name ?? "Someone important",
        status,
        expiresAt: invitation.expiresAt,
      },
    });
  });

  app.post("/auth/register", (c) => forwardAuth(c.req.raw, "/auth/sign-up/email", auth));
  app.post("/auth/login", (c) => forwardAuth(c.req.raw, "/auth/sign-in/email", auth));
  app.post("/auth/demo", async (c) => {
    const setting = await demoMode.get(DEMO_MODE_ID);
    if (!setting?.enabled) throw new HTTPException(403, { message: "Demo access is currently unavailable" });

    const input = demoLoginSchema.safeParse(await c.req.json().catch(() => null));
    if (!input.success) throw new HTTPException(400, { message: "Choose a valid demo person" });
    const selected = DEMO_PERSONAS.find((persona) => persona.id === input.data.personaId);
    if (!selected) throw new HTTPException(400, { message: "Choose a valid demo person" });
    const users = new Map<string, AuthUserRecord>();
    for (const persona of DEMO_PERSONAS) {
      let user = await authUsers.findOne((candidate) => candidate.email.toLowerCase() === persona.email);
      if (!user) {
        await forwardAuthJson(c.req.raw, "/auth/sign-up/email", auth, {
          name: persona.name,
          email: persona.email,
          password: await demoPassword(persona.id),
        });
        user = await authUsers.findOne((candidate) => candidate.email.toLowerCase() === persona.email);
      }
      if (!user) throw new HTTPException(503, { message: "Demo access could not be prepared" });
      users.set(persona.id, user);
    }
    await ensureDemoWorkspace(repositories, store, users);
    const response = await forwardAuthJson(c.req.raw, "/auth/sign-in/email", auth, {
      email: selected.email,
      password: await demoPassword(selected.id),
    });
    if (!response.ok) return response;
    return response;
  });
  app.post("/auth/logout", (c) => forwardAuth(c.req.raw, "/auth/sign-out", auth));
  app.post("/auth/update-user", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) requirePermanentAccount(session.user);
    return auth.handler(c.req.raw);
  });
  app.post("/auth/change-password", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) requirePermanentAccount(session.user);
    return auth.handler(c.req.raw);
  });
  app.post("/auth/delete-user", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) requirePermanentAccount(session.user);
    return auth.handler(c.req.raw);
  });
  app.get("/auth/me", async (c) => {
    let session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session && await promoteBootstrapAdmin(authUsers, session.user)) {
      session = await auth.api.getSession({ headers: c.req.raw.headers });
    }
    if (!session) throw new HTTPException(401, { message: "Sign in to continue" });
    return c.json({
      ...session,
      user: {
        ...session.user,
        isSuperAdmin: isBootstrapAdmin(session.user.email),
        isDemo: isDemoUser(session.user),
      },
    });
  });
  app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

  app.use("/api/*", async (c, next) => {
    let session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new HTTPException(401, { message: "Sign in to continue" });
    if (await promoteBootstrapAdmin(authUsers, session.user)) {
      session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) throw new HTTPException(401, { message: "Sign in to continue" });
    }
    c.set("user", session.user);
    c.set("session", session.session);
    await acceptPendingInvitations(repositories, session.user);
    await next();
  });

  app.post("/api/account/profile", zValidator("json", updateProfileSchema), async (c) => {
    const user = c.get("user")!;
    requirePermanentAccount(user);
    const input = c.req.valid("json");
    const response = await forwardAuthJson(c.req.raw, "/auth/update-user", auth, input);
    if (!response.ok) return response;

    const memberships = await repositories.members.find((member) => member.userId === user.id);
    await Promise.all(memberships.map((member) => repositories.members.put({ ...member, name: input.name })));
    return response;
  });

  app.post("/api/account/password", zValidator("json", changePasswordSchema), async (c) => {
    requirePermanentAccount(c.get("user")!);
    const input = c.req.valid("json");
    return forwardAuthJson(c.req.raw, "/auth/change-password", auth, {
      ...input,
      revokeOtherSessions: true,
    });
  });

  app.post("/api/account/avatar", async (c) => {
    const user = c.get("user")!;
    requirePermanentAccount(user);
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throw new HTTPException(400, { message: "Choose an image to upload" });
    if (file.size <= 0) throw new HTTPException(400, { message: "The selected image is empty" });
    if (file.size > 5 * 1024 * 1024) throw new HTTPException(413, { message: "Profile pictures are limited to 5 MB" });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const image = detectedImage(bytes);
    if (!image) throw new HTTPException(415, { message: "Use a PNG, JPEG, WebP, or GIF image" });

    const previous = await repositories.avatars.get(user.id);
    const version = id();
    const avatar: Avatar = {
      id: user.id,
      userId: user.id,
      storageKey: `zo-moments/profile-images/${user.id}/${version}.${image.extension}`,
      mimeType: image.mimeType,
      size: file.size,
      updatedAt: now(),
    };
    await store.put(avatar.storageKey, bytes, { contentType: avatar.mimeType });
    const response = await forwardAuthJson(c.req.raw, "/auth/update-user", auth, { image: version });
    if (!response.ok) {
      await store.delete(avatar.storageKey);
      return response;
    }
    await repositories.avatars.put(avatar);
    if (previous) await store.delete(previous.storageKey);
    return c.json({ image: version });
  });

  app.delete("/api/account/avatar", async (c) => {
    const user = c.get("user")!;
    requirePermanentAccount(user);
    const avatar = await repositories.avatars.get(user.id);
    const response = await forwardAuthJson(c.req.raw, "/auth/update-user", auth, { image: null });
    if (!response.ok) return response;
    if (avatar) await store.delete(avatar.storageKey);
    await repositories.avatars.delete(user.id);
    return c.body(null, 204);
  });

  app.get("/api/users/:userId/avatar", async (c) => {
    const avatar = await repositories.avatars.get(c.req.param("userId"));
    if (!avatar) throw new HTTPException(404, { message: "Profile picture not found" });
    const blob = await store.get(avatar.storageKey);
    if (!blob) throw new HTTPException(404, { message: "Stored profile picture not found" });
    return new Response(blob, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(avatar.size),
        "Content-Type": avatar.mimeType,
      },
    });
  });

  app.get("/api/admin/users", async (c) => {
    const currentUser = c.get("user")!;
    requireAdmin(currentUser);
    const search = c.req.query("search")?.trim().toLowerCase() ?? "";
    const [users, memberships] = await Promise.all([authUsers.list(), repositories.members.list()]);
    const spaceCounts = new Map<string, number>();
    for (const membership of memberships) {
      spaceCounts.set(membership.userId, (spaceCounts.get(membership.userId) ?? 0) + 1);
    }
    const results = users
      .filter((user) => !isDemoUser(user))
      .filter((user) => !search || `${user.name} ${user.email}`.toLowerCase().includes(search))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 200)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        role: user.role === "admin" ? "admin" : "user",
        status: user.banned ? "suspended" : "active",
        banReason: user.banReason ?? null,
        createdAt: new Date(user.createdAt).toISOString(),
        spaceCount: spaceCounts.get(user.id) ?? 0,
      }));
    return c.json({ users: results, total: results.length });
  });

  app.post("/api/admin/users/:userId/role", zValidator("json", updateAdminRoleSchema), async (c) => {
    const currentUser = c.get("user")!;
    requireAdmin(currentUser);
    const targetId = c.req.param("userId");
    const { role } = c.req.valid("json");
    if (targetId === currentUser.id) throw new HTTPException(400, { message: "You cannot change your own administrator role" });
    const target = await authUsers.get(targetId);
    if (!target) throw new HTTPException(404, { message: "User not found" });
    if (role !== "admin" && isBootstrapAdmin(target.email)) {
      throw new HTTPException(400, { message: "A configured bootstrap administrator cannot be demoted" });
    }
    return forwardAuthJson(c.req.raw, "/auth/admin/set-role", auth, { userId: targetId, role });
  });

  app.post("/api/admin/users/:userId/status", zValidator("json", updateAccountStatusSchema), async (c) => {
    const currentUser = c.get("user")!;
    requireAdmin(currentUser);
    const targetId = c.req.param("userId");
    const input = c.req.valid("json");
    if (targetId === currentUser.id) throw new HTTPException(400, { message: "You cannot suspend your own account" });
    const target = await authUsers.get(targetId);
    if (!target) throw new HTTPException(404, { message: "User not found" });
    if (input.status === "suspended" && isBootstrapAdmin(target.email)) {
      throw new HTTPException(400, { message: "A configured bootstrap administrator cannot be suspended" });
    }
    if (input.status === "active") {
      return forwardAuthJson(c.req.raw, "/auth/admin/unban-user", auth, { userId: targetId });
    }
    return forwardAuthJson(c.req.raw, "/auth/admin/ban-user", auth, {
      userId: targetId,
      banReason: input.reason || "Suspended by an administrator",
    });
  });

  app.get("/api/admin/demo-mode", async (c) => {
    const currentUser = c.get("user")!;
    requireSuperAdmin(currentUser);
    const setting = await demoMode.get(DEMO_MODE_ID);
    return c.json({
      enabled: setting?.enabled ?? false,
      updatedAt: setting?.updatedAt ?? null,
      updatedBy: setting?.updatedBy ?? null,
      personas: publicDemoPersonas(),
    });
  });

  app.post("/api/admin/demo-mode", zValidator("json", updateDemoModeSchema), async (c) => {
    const currentUser = c.get("user")!;
    requireSuperAdmin(currentUser);
    const setting: DemoModeRecord = {
      id: DEMO_MODE_ID,
      enabled: c.req.valid("json").enabled,
      updatedAt: now(),
      updatedBy: currentUser.id,
    };
    await demoMode.put(setting);
    return c.json({ enabled: setting.enabled, updatedAt: setting.updatedAt, updatedBy: setting.updatedBy, personas: publicDemoPersonas() });
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
      repositories.stories.deleteWhere((story) => story.spaceId === spaceId),
      repositories.invitations.deleteWhere((invitation) => invitation.spaceId === spaceId),
      repositories.shareInvitations.deleteWhere((invitation) => invitation.spaceId === spaceId),
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

  app.post("/api/spaces/:spaceId/share-invitation", zValidator("json", createShareInvitationSchema), async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireOwner(repositories, spaceId, user.id);
    const { regenerate } = c.req.valid("json");
    const active = await repositories.shareInvitations.findOne(
      (invitation) => invitation.spaceId === spaceId && shareInvitationStatus(invitation) === "active",
    );
    if (active && !regenerate) return c.json({ invitation: active });
    if (active) await repositories.shareInvitations.put({ ...active, status: "revoked" });

    const createdAt = now();
    const invitation: ShareInvitation = {
      id: id(),
      spaceId,
      token: invitationToken(),
      invitedBy: user.id,
      status: "active",
      createdAt,
      expiresAt: new Date(Date.now() + SHARE_INVITATION_LIFETIME_MS).toISOString(),
      acceptedAt: null,
      acceptedBy: null,
    };
    await repositories.shareInvitations.put(invitation);
    return c.json({ invitation }, 201);
  });

  app.delete("/api/spaces/:spaceId/share-invitation", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireOwner(repositories, spaceId, user.id);
    const active = await repositories.shareInvitations.findOne(
      (invitation) => invitation.spaceId === spaceId && shareInvitationStatus(invitation) === "active",
    );
    if (active) await repositories.shareInvitations.put({ ...active, status: "revoked" });
    return c.body(null, 204);
  });

  app.post("/api/invitations/:token/accept", async (c) => {
    const user = c.get("user")!;
    const invitation = await repositories.shareInvitations.findOne(
      (candidate) => candidate.token === c.req.param("token"),
    );
    if (!invitation) throw new HTTPException(404, { message: "Invitation not found" });
    if (shareInvitationStatus(invitation) !== "active") {
      throw new HTTPException(410, { message: "This invitation is no longer available" });
    }
    const space = await repositories.spaces.get(invitation.spaceId);
    if (!space) throw new HTTPException(410, { message: "This shared space is no longer available" });
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
      await repositories.shareInvitations.put({
        ...invitation,
        status: "accepted",
        acceptedAt: now(),
        acceptedBy: user.id,
      });
    }
    return c.json({ space });
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

  app.get("/api/spaces/:spaceId/stories", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    let stories = await repositories.stories.find((story) => story.spaceId === spaceId);
    if (spaceId === DEMO_SPACE_ID && stories.length === 0) {
      const space = await repositories.spaces.get(spaceId);
      if (space) {
        const seeded = demoStory(space.ownerId);
        await repositories.stories.put(seeded);
        stories = [seeded];
      }
    }
    return c.json({ stories: stories.map(normaliseStory).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
  });

  app.post("/api/spaces/:spaceId/stories/suggest-style", zValidator("json", suggestStoryStyleSchema), async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const input = c.req.valid("json");
    const moments = await Promise.all(input.momentIds.map((momentId) => repositories.objects.get(momentId)));
    if (moments.some((moment) => !moment || moment.spaceId !== spaceId)) {
      throw new HTTPException(400, { message: "Every selected moment must belong to this shared space" });
    }
    const selectedMoments = moments.filter((moment): moment is MomentObject => Boolean(moment));
    const suggested = await aiStoryStyle(selectedMoments);
    return c.json(suggested ? { ...suggested, source: "ai" as const } : { ...recommendStoryStyle(selectedMoments), source: "auto" as const });
  });

  app.post("/api/spaces/:spaceId/stories", zValidator("json", createStorySchema), async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    await requireMember(repositories, spaceId, user.id);
    const input = c.req.valid("json");
    const moments = await Promise.all(input.momentIds.map((momentId) => repositories.objects.get(momentId)));
    if (moments.some((moment) => !moment || moment.spaceId !== spaceId)) {
      throw new HTTPException(400, { message: "Every selected moment must belong to this shared space" });
    }
    const recommended = recommendStoryStyle(moments.filter((moment): moment is MomentObject => Boolean(moment)));
    const style = input.style === "auto" ? recommended.style : input.style;
    const styleSource = input.style === "auto" ? "auto" : (input.styleSource ?? "manual");
    const timestamp = now();
    const story: Story = {
      id: id(),
      spaceId,
      title: input.title,
      location: input.location || null,
      opening: input.opening,
      momentIds: input.momentIds,
      style,
      styleSource,
      styleRationale: input.styleRationale || (input.style === "auto" ? recommended.rationale : null),
      createdBy: user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await repositories.stories.put(story);
    return c.json({ story }, 201);
  });

  app.delete("/api/spaces/:spaceId/stories/:storyId", async (c) => {
    const user = c.get("user")!;
    const spaceId = c.req.param("spaceId");
    const membership = await requireMember(repositories, spaceId, user.id);
    const story = await repositories.stories.get(c.req.param("storyId"));
    if (!story || story.spaceId !== spaceId) throw new HTTPException(404, { message: "Story not found" });
    if (membership.role !== "owner" && story.createdBy !== user.id) {
      throw new HTTPException(403, { message: "Only the story creator or space owner can delete it" });
    }
    await repositories.stories.delete(story.id);
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
    const stories = await repositories.stories.find((story) => story.spaceId === spaceId && story.momentIds.includes(object.id));
    await Promise.all(stories.map(async (story) => {
      const momentIds = story.momentIds.filter((momentId) => momentId !== object.id);
      if (momentIds.length === 0) return repositories.stories.delete(story.id);
      return repositories.stories.put({ ...story, momentIds, updatedAt: now() });
    }));
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
