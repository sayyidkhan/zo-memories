import { beforeAll, describe, expect, test } from "bun:test";
import type { Story, StoryRevision } from "@zo-moments/types";
import { createApp } from "../src/app";
import { MemoryBlobStore } from "../src/storage/blob-store";

process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "memory";
process.env.BETTER_AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
process.env.BETTER_AUTH_URL = "http://localhost";
process.env.APP_ORIGIN = "http://localhost";
process.env.ADMIN_EMAILS = "admin@example.com";

class BrowserSession {
  private cookies = new Map<string, string>();

  constructor(private readonly app: ReturnType<typeof createApp>["app"]) {}

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.cookies.size) {
      headers.set("cookie", [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    }
    if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await this.app.request(path, { ...init, headers });
    const setCookies = response.headers.getSetCookie();
    for (const header of setCookies) {
      const [pair] = header.split(";", 1);
      const separator = pair?.indexOf("=") ?? -1;
      if (pair && separator > 0) this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  }

  async json<T>(path: string, init: RequestInit = {}): Promise<{ response: Response; body: T }> {
    const response = await this.request(path, init);
    return { response, body: (await response.json()) as T };
  }
}

describe("Zo Moments API", () => {
  const store = new MemoryBlobStore();
  const { app } = createApp({ store, log: false });
  const owner = new BrowserSession(app);
  const member = new BrowserSession(app);
  const stranger = new BrowserSession(app);
  let spaceId = "";

  beforeAll(async () => {
    const register = await owner.json<{ user: { id: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Owner", email: "owner@example.com", password: "password123" }),
    });
    expect(register.response.status).toBe(200);
  });

  test("creates a private shared space", async () => {
    const result = await owner.json<{ space: { id: string; name: string } }>("/api/spaces", {
      method: "POST",
      body: JSON.stringify({ name: "Our Story", description: "A private place" }),
    });
    expect(result.response.status).toBe(201);
    expect(result.body.space.name).toBe("Our Story");
    spaceId = result.body.space.id;
  });

  test("invites a member and accepts on first authenticated request", async () => {
    const invite = await owner.request(`/api/spaces/${spaceId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email: "member@example.com" }),
    });
    expect(invite.status).toBe(201);

    const register = await member.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Member", email: "member@example.com", password: "password123" }),
    });
    expect(register.status).toBe(200);

    const spaces = await member.json<{ spaces: { id: string }[] }>("/api/spaces");
    expect(spaces.response.status).toBe(200);
    expect(spaces.body.spaces.map(({ id }) => id)).toContain(spaceId);
  });

  test("shares, accepts, regenerates, and revokes invitation links", async () => {
    const create = await owner.json<{ invitation: { token: string } }>(`/api/spaces/${spaceId}/share-invitation`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(create.response.status).toBe(201);
    expect(create.body.invitation.token).toHaveLength(48);
    const token = create.body.invitation.token;

    const reused = await owner.json<{ invitation: { token: string } }>(`/api/spaces/${spaceId}/share-invitation`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(reused.response.status).toBe(200);
    expect(reused.body.invitation.token).toBe(token);

    const preview = await app.request(`/public/invitations/${token}`);
    expect(preview.status).toBe(200);
    expect((await preview.json() as { invitation: { spaceName: string } }).invitation.spaceName).toBe("Our Story");

    const invited = new BrowserSession(app);
    expect((await invited.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Link Member", email: "link-member@example.com", password: "password123" }),
    })).status).toBe(200);
    const accepted = await invited.json<{ space: { id: string } }>(`/api/invitations/${token}/accept`, { method: "POST" });
    expect(accepted.response.status).toBe(200);
    expect(accepted.body.space.id).toBe(spaceId);
    const spaces = await invited.json<{ spaces: { id: string }[] }>("/api/spaces");
    expect(spaces.body.spaces.map(({ id }) => id)).toContain(spaceId);
    expect((await app.request(`/public/invitations/${token}`)).status).toBe(410);

    const second = new BrowserSession(app);
    expect((await second.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Second Person", email: "second@example.com", password: "password123" }),
    })).status).toBe(200);
    expect((await second.request(`/api/invitations/${token}/accept`, { method: "POST" })).status).toBe(410);

    const replacement = await owner.json<{ invitation: { token: string } }>(`/api/spaces/${spaceId}/share-invitation`, {
      method: "POST",
      body: JSON.stringify({ regenerate: true }),
    });
    expect(replacement.response.status).toBe(201);
    expect(replacement.body.invitation.token).not.toBe(token);
    expect((await owner.request(`/api/spaces/${spaceId}/share-invitation`, { method: "DELETE" })).status).toBe(204);
    expect((await app.request(`/public/invitations/${replacement.body.invitation.token}`)).status).toBe(410);
  });

  test("lets only the space owner manage its member list", async () => {
    const invite = await owner.request(`/api/spaces/${spaceId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email: "removable@example.com" }),
    });
    expect(invite.status).toBe(201);

    const removable = new BrowserSession(app);
    const registered = await removable.json<{ user: { id: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Removable Member", email: "removable@example.com", password: "password123" }),
    });
    expect(registered.response.status).toBe(200);
    expect((await removable.request("/api/spaces")).status).toBe(200);

    const directory = await owner.json<{ members: { userId: string; name: string }[] }>(`/api/spaces/${spaceId}/members`);
    expect(directory.body.members.map(({ name }) => name)).toContain("Removable Member");
    expect((await member.request(`/api/spaces/${spaceId}/members/${registered.body.user.id}`, { method: "DELETE" })).status).toBe(403);
    expect((await owner.request(`/api/spaces/${spaceId}/members/${registered.body.user.id}`, { method: "DELETE" })).status).toBe(204);

    const updated = await owner.json<{ members: { userId: string }[] }>(`/api/spaces/${spaceId}/members`);
    expect(updated.body.members.map(({ userId }) => userId)).not.toContain(registered.body.user.id);
    expect((await removable.request(`/api/spaces/${spaceId}`)).status).toBe(403);
  });

  test("uploads, lists, previews, and deletes a memory", async () => {
    const form = new FormData();
    form.set("file", new File(["moment"], "hello.txt", { type: "text/plain" }));
    form.set("caption", "A tiny memory");
    const upload = await owner.json<{ object: { id: string } }>(`/api/spaces/${spaceId}/objects`, {
      method: "POST",
      body: form,
    });
    expect(upload.response.status).toBe(201);

    const list = await member.json<{ objects: { id: string }[] }>(`/api/spaces/${spaceId}/objects`);
    expect(list.body.objects).toHaveLength(1);

    const preview = await member.request(`/api/spaces/${spaceId}/objects/${upload.body.object.id}`);
    expect(preview.status).toBe(200);
    expect(await preview.text()).toBe("moment");

    const unsupported = new FormData();
    unsupported.set("file", new File(["binary"], "program.exe", { type: "application/octet-stream" }));
    expect((await owner.request(`/api/spaces/${spaceId}/objects`, { method: "POST", body: unsupported })).status).toBe(415);

    const forbidden = await member.request(`/api/spaces/${spaceId}/objects/${upload.body.object.id}`, { method: "DELETE" });
    expect(forbidden.status).toBe(403);

    const removed = await owner.request(`/api/spaces/${spaceId}/objects/${upload.body.object.id}`, { method: "DELETE" });
    expect(removed.status).toBe(204);
  });

  test("turns selected moments into a private shared story", async () => {
    const momentIds: string[] = [];
    const samples: Array<[string, string]> = [["arrival.jpg", "We arrived before the rain"], ["dinner.jpg", "Dinner ran until midnight"]];
    for (const [name, caption] of samples) {
      const form = new FormData();
      form.set("file", new File([name], name, { type: "image/jpeg" }));
      form.set("caption", caption);
      const upload = await owner.json<{ object: { id: string } }>(`/api/spaces/${spaceId}/objects`, { method: "POST", body: form });
      expect(upload.response.status).toBe(201);
      momentIds.push(upload.body.object.id);
    }

    const suggestion = await owner.json<{ style: string; source: string; rationale: string }>(`/api/spaces/${spaceId}/stories/suggest-style`, {
      method: "POST",
      body: JSON.stringify({ momentIds }),
    });
    expect(suggestion.response.status).toBe(200);
    expect(suggestion.body.style).toBe("classic");
    expect(suggestion.body.source).toBe("auto");
    expect(suggestion.body.rationale.length).toBeGreaterThan(10);

    const opening = await owner.json<{ opening: string; source: string }>(`/api/spaces/${spaceId}/stories/suggest-opening`, {
      method: "POST",
      body: JSON.stringify({ title: "Rainy Kyoto", location: "Kyoto", momentIds }),
    });
    expect(opening.response.status).toBe(200);
    expect(opening.body.source).toBe("auto");
    expect(opening.body.opening.length).toBeGreaterThan(10);

    const blueprint = await owner.json<{ blueprint: { summary: string; chapters: Array<{ momentIds: string[] }>; closing: string }; source: string }>(`/api/spaces/${spaceId}/stories/suggest-blueprint`, {
      method: "POST",
      body: JSON.stringify({ title: "Rainy Kyoto", location: "Kyoto", opening: opening.body.opening, momentIds }),
    });
    expect(blueprint.response.status).toBe(200);
    expect(blueprint.body.source).toBe("auto");
    expect(blueprint.body.blueprint.chapters.flatMap((chapter) => chapter.momentIds)).toEqual(momentIds);

    const retired = await owner.request(`/api/spaces/${spaceId}/stories`, {
      method: "POST",
      body: JSON.stringify({
        title: "Retired prototype",
        opening: "This old presentation style should no longer be available.",
        momentIds,
        style: "comic",
        styleSource: "manual",
      }),
    });
    expect(retired.status).toBe(400);

    const created = await owner.json<{ story: Story }>(`/api/spaces/${spaceId}/stories`, {
      method: "POST",
      body: JSON.stringify({
        title: "The weekend the rain followed us",
        location: "Kyoto",
        opening: "We arrived with no plan and left with a story we still tell.",
        momentIds,
        style: "scrapbook",
        styleSource: "manual",
        blueprint: blueprint.body.blueprint,
      }),
    });
    expect(created.response.status).toBe(201);
    expect(created.body.story.momentIds).toEqual(momentIds);
    expect(created.body.story.style).toBe("scrapbook");
    expect(created.body.story.styleSource).toBe("manual");
    expect(created.body.story.styleRationale).toBeNull();
    expect(created.body.story.canvas?.title).toBe("The weekend the rain followed us");
    expect(created.body.story.canvas?.moments.map(({ title }) => title)).toEqual(samples.map(([, caption]) => caption));
    expect(created.body.story.blueprint?.chapters).toHaveLength(2);

    const shared = await member.json<{ stories: { title: string }[] }>(`/api/spaces/${spaceId}/stories`);
    expect(shared.response.status).toBe(200);
    expect(shared.body.stories.map(({ title }) => title)).toContain("The weekend the rain followed us");

    const socialImage = new FormData();
    socialImage.set("preset", "instagram-feed");
    socialImage.set("file-0", new File(["social-cover"], "story-01.png", { type: "image/png" }));
    socialImage.set("file-1", new File(["social-moment"], "story-02.png", { type: "image/png" }));
    const socialUpload = await owner.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports`, {
      method: "POST",
      body: socialImage,
    });
    expect(socialUpload.status).toBe(201);
    const socialJpeg = new FormData();
    socialJpeg.set("preset", "facebook-feed");
    socialJpeg.set("file-0", new File(["jpeg-cover"], "story-01.jpg", { type: "image/jpeg" }));
    socialJpeg.set("file-1", new File(["jpeg-moment"], "story-02.jpg", { type: "image/jpeg" }));
    expect((await owner.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports`, {
      method: "POST",
      body: socialJpeg,
    })).status).toBe(201);
    const socialVideo = new FormData();
    socialVideo.set("preset", "tiktok");
    socialVideo.set("file-0", new File(["social-video"], "story.mp4", { type: "video/mp4" }));
    expect((await owner.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports`, {
      method: "POST",
      body: socialVideo,
    })).status).toBe(201);
    const socialStatus = await member.json<Record<string, number>>(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports`);
    expect(socialStatus.body["instagram-feed"]).toBe(2);
    expect(socialStatus.body["facebook-feed"]).toBe(2);
    expect(socialStatus.body.tiktok).toBe(1);
    const socialContent = await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports/instagram-feed`);
    expect(socialContent.headers.get("content-type")).toBe("image/png");
    expect(await socialContent.text()).toBe("social-cover");
    const socialSlide = await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports/instagram-feed/slides/1`);
    expect(socialSlide.headers.get("content-type")).toBe("image/png");
    expect(await socialSlide.text()).toBe("social-moment");
    const socialJpegContent = await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports/facebook-feed`);
    expect(socialJpegContent.headers.get("content-type")).toBe("image/jpeg");
    expect(await socialJpegContent.text()).toBe("jpeg-cover");
    const socialVideoContent = await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports/tiktok`);
    expect(socialVideoContent.headers.get("content-type")).toBe("video/mp4");
    expect(await socialVideoContent.text()).toBe("social-video");

    const updateInput = {
      title: "The Kyoto chapter we kept",
      location: "Kyoto to Osaka",
      opening: "We changed the plan halfway through and found the part of the journey worth keeping.",
      momentIds,
      style: "cinematic",
      styleSource: "manual",
    };
    expect((await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}`, {
      method: "PATCH",
      body: JSON.stringify(updateInput),
    })).status).toBe(403);
    const updated = await owner.json<{ story: Story }>(`/api/spaces/${spaceId}/stories/${created.body.story.id}`, {
      method: "PATCH",
      body: JSON.stringify(updateInput),
    });
    expect(updated.response.status).toBe(200);
    expect(updated.body.story.id).toBe(created.body.story.id);
    expect(updated.body.story.title).toBe(updateInput.title);
    expect(updated.body.story.location).toBe(updateInput.location);
    expect(updated.body.story.opening).toBe(updateInput.opening);
    expect(updated.body.story.style).toBe("cinematic");
    expect(updated.body.story.momentIds).toEqual(momentIds);
    const clearedSocialStatus = await owner.json<Record<string, number>>(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports`);
    expect(clearedSocialStatus.body["instagram-feed"]).toBe(0);
    expect(clearedSocialStatus.body.tiktok).toBe(0);

    const regeneratedSocial = new FormData();
    regeneratedSocial.set("preset", "instagram-feed");
    regeneratedSocial.set("file-0", new File(["regenerated-cover"], "story-01.png", { type: "image/png" }));
    expect((await owner.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports`, { method: "POST", body: regeneratedSocial })).status).toBe(201);

    const canvas = {
      ...updated.body.story.canvas!,
      title: "Kyoto, rewritten on the canvas",
      location: "A route we renamed",
      dateRange: "Our long weekend",
      opening: "This opening exists only inside the finished story and no longer follows the source moments.",
      moments: updated.body.story.canvas!.moments.map((moment, index) => index === 0 ? { ...moment, title: "A new first scene", meta: "Friday evening · Our own note" } : moment),
      blueprint: {
        ...updated.body.story.canvas!.blueprint!,
        chapters: updated.body.story.canvas!.blueprint!.chapters.map((chapter, index) => index === 0 ? { ...chapter, title: "The rainy arrival" } : chapter),
        closing: "We came home with a story that still belongs to all of us.",
      },
    };
    expect((await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/canvas`, { method: "PATCH", body: JSON.stringify({ canvas }) })).status).toBe(403);
    const canvasUpdate = await owner.json<{ story: Story }>(`/api/spaces/${spaceId}/stories/${created.body.story.id}/canvas`, { method: "PATCH", body: JSON.stringify({ canvas }) });
    expect(canvasUpdate.response.status).toBe(200);
    expect(canvasUpdate.body.story.title).toBe(canvas.title);
    expect(canvasUpdate.body.story.location).toBe(canvas.location);
    expect(canvasUpdate.body.story.opening).toBe(canvas.opening);
    expect(canvasUpdate.body.story.canvas).toEqual(canvas);
    expect(canvasUpdate.body.story.blueprint?.chapters[0]?.title).toBe("The rainy arrival");
    expect((await owner.json<Record<string, number>>(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports`)).body["instagram-feed"]).toBe(0);

    expect((await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/revisions`)).status).toBe(403);
    const history = await owner.json<{ revisions: StoryRevision[] }>(`/api/spaces/${spaceId}/stories/${created.body.story.id}/revisions`);
    expect(history.response.status).toBe(200);
    expect(history.body.revisions.length).toBeGreaterThanOrEqual(2);
    const beforeCanvasEdit = history.body.revisions.find((revision) => revision.canvas.title === updateInput.title);
    expect(beforeCanvasEdit).toBeDefined();
    const restored = await owner.json<{ story: Story }>(`/api/spaces/${spaceId}/stories/${created.body.story.id}/revisions/${beforeCanvasEdit!.id}/restore`, { method: "POST" });
    expect(restored.response.status).toBe(200);
    expect(restored.body.story.canvas?.title).toBe(updateInput.title);
    expect(restored.body.story.blueprint?.chapters[0]?.title).not.toBe("The rainy arrival");
    const restoredHistory = await owner.json<{ revisions: StoryRevision[] }>(`/api/spaces/${spaceId}/stories/${created.body.story.id}/revisions`);
    expect(restoredHistory.body.revisions.some((revision) => revision.canvas.title === canvas.title)).toBe(true);

    const outsider = new BrowserSession(app);
    expect((await outsider.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Story Stranger", email: "story-stranger@example.com", password: "password123" }),
    })).status).toBe(200);
    expect((await outsider.request(`/api/spaces/${spaceId}/stories`)).status).toBe(403);
    expect((await outsider.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}/social-exports/instagram-feed`)).status).toBe(403);
    expect((await member.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}`, { method: "DELETE" })).status).toBe(403);
    expect((await owner.request(`/api/spaces/${spaceId}/stories/${created.body.story.id}`, { method: "DELETE" })).status).toBe(204);
    expect(await store.get(`zo-moments/social-exports/${spaceId}/${created.body.story.id}/instagram-feed-01.png`)).toBeNull();
    expect(await store.get(`zo-moments/social-exports/${spaceId}/${created.body.story.id}/instagram-feed-02.png`)).toBeNull();
    expect(await store.get(`zo-moments/social-exports/${spaceId}/${created.body.story.id}/tiktok.mp4`)).toBeNull();
  });

  test("blocks non-members", async () => {
    await stranger.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Stranger", email: "stranger@example.com", password: "password123" }),
    });
    const response = await stranger.request(`/api/spaces/${spaceId}`);
    expect(response.status).toBe(403);
  });

  test("updates profile details and rotates the account password", async () => {
    const account = new BrowserSession(app);
    const register = await account.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Old Name", email: "profile@example.com", password: "secret" }),
    });
    expect(register.status).toBe(200);

    const created = await account.json<{ space: { id: string } }>("/api/spaces", {
      method: "POST",
      body: JSON.stringify({ name: "Profile Test" }),
    });
    expect(created.response.status).toBe(201);

    const profile = await account.request("/api/account/profile", {
      method: "POST",
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(profile.status).toBe(200);

    const me = await account.json<{ user: { name: string; email: string } }>("/auth/me");
    expect(me.body.user.name).toBe("New Name");
    expect(me.body.user.email).toBe("profile@example.com");

    const detail = await account.json<{ members: { name: string }[] }>(`/api/spaces/${created.body.space.id}`);
    expect(detail.body.members[0]?.name).toBe("New Name");

    const password = await account.request("/api/account/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "secret", newPassword: "newest" }),
    });
    expect(password.status).toBe(200);

    expect((await account.request("/auth/logout", { method: "POST" })).status).toBe(200);
    expect((await account.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "profile@example.com", password: "secret" }),
    })).status).toBe(401);
    expect((await account.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "profile@example.com", password: "newest" }),
    })).status).toBe(200);
  });

  test("uploads, serves, replaces, and removes a private profile picture", async () => {
    const account = new BrowserSession(app);
    expect((await account.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Avatar Person", email: "avatar@example.com", password: "password123" }),
    })).status).toBe(200);

    const invalid = new FormData();
    invalid.set("file", new File(["not really an image"], "fake.png", { type: "image/png" }));
    expect((await account.request("/api/account/avatar", { method: "POST", body: invalid })).status).toBe(415);

    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const upload = new FormData();
    upload.set("file", new File([png], "profile.png", { type: "image/png" }));
    const uploaded = await account.json<{ image: string }>("/api/account/avatar", { method: "POST", body: upload });
    expect(uploaded.response.status).toBe(200);

    const me = await account.json<{ user: { id: string; image: string } }>("/auth/me");
    expect(me.body.user.image).toBe(uploaded.body.image);
    const content = await account.request(`/api/users/${me.body.user.id}/avatar`);
    expect(content.status).toBe(200);
    expect(content.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await content.arrayBuffer())).toEqual(png);

    expect((await app.request(`/api/users/${me.body.user.id}/avatar`)).status).toBe(401);
    expect((await account.request("/api/account/avatar", { method: "DELETE" })).status).toBe(204);
    expect((await account.request(`/api/users/${me.body.user.id}/avatar`)).status).toBe(404);
  });

  test("lets administrators manage account roles and access", async () => {
    const admin = new BrowserSession(app);
    const managed = new BrowserSession(app);
    expect((await admin.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Administrator", email: "admin@example.com", password: "password123" }),
    })).status).toBe(200);
    const adminMe = await admin.json<{ user: { id: string; role: string } }>("/auth/me");
    expect(adminMe.body.user.role).toBe("admin");

    const managedRegistration = await managed.json<{ user: { id: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Managed Person", email: "managed@example.com", password: "password123" }),
    });
    expect(managedRegistration.response.status).toBe(200);
    const managedId = managedRegistration.body.user.id;

    expect((await owner.request("/api/admin/users")).status).toBe(403);
    const directory = await admin.json<{ users: { id: string; email: string }[] }>("/api/admin/users?search=managed");
    expect(directory.response.status).toBe(200);
    expect(directory.body.users.map((user) => user.email)).toEqual(["managed@example.com"]);

    const role = await admin.request(`/api/admin/users/${managedId}/role`, {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
    });
    expect(role.status).toBe(200);

    const suspended = await admin.request(`/api/admin/users/${managedId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "suspended", reason: "Integration test" }),
    });
    expect(suspended.status).toBe(200);
    expect((await managed.request("/api/spaces")).status).toBe(401);
    expect((await managed.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "managed@example.com", password: "password123" }),
    })).status).toBe(403);

    expect((await admin.request(`/api/admin/users/${managedId}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "active" }),
    })).status).toBe(200);
    expect((await managed.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "managed@example.com", password: "password123" }),
    })).status).toBe(200);

    expect((await admin.request(`/api/admin/users/${adminMe.body.user.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status: "suspended" }),
    })).status).toBe(400);
  });

  test("lets only the super administrator control passwordless demo access", async () => {
    const publicStatus = await app.request("/public/demo-mode");
    expect(publicStatus.status).toBe(200);
    expect((await publicStatus.json() as { enabled: boolean }).enabled).toBe(false);
    expect((await app.request("/auth/demo", { method: "POST" })).status).toBe(403);

    const superAdmin = new BrowserSession(app);
    expect((await superAdmin.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "password123" }),
    })).status).toBe(200);
    const superAdminMe = await superAdmin.json<{ user: { isSuperAdmin: boolean } }>("/auth/me");
    expect(superAdminMe.body.user.isSuperAdmin).toBe(true);

    const promotedAdmin = new BrowserSession(app);
    expect((await promotedAdmin.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "managed@example.com", password: "password123" }),
    })).status).toBe(200);
    expect((await promotedAdmin.request("/api/admin/demo-mode")).status).toBe(403);
    expect((await promotedAdmin.request("/api/admin/demo-mode", {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    })).status).toBe(403);

    const enabled = await superAdmin.json<{ enabled: boolean }>("/api/admin/demo-mode", {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    });
    expect(enabled.response.status).toBe(200);
    expect(enabled.body.enabled).toBe(true);
    const enabledPublicStatus = await app.request("/public/demo-mode");
    const enabledPublicBody = await enabledPublicStatus.json() as { enabled: boolean; personas: { id: string }[] };
    expect(enabledPublicBody.enabled).toBe(true);
    expect(enabledPublicBody.personas.map(({ id }) => id)).toEqual(["maya", "leo", "sam"]);

    const visitor = new BrowserSession(app);
    expect((await visitor.request("/auth/demo", {
      method: "POST",
      body: JSON.stringify({ personaId: "maya" }),
    })).status).toBe(200);
    const demoMe = await visitor.json<{ user: { email: string; isDemo: boolean; isSuperAdmin: boolean } }>("/auth/me");
    expect(demoMe.body.user.email).toBe("demo-maya@zo-moments.example");
    expect(demoMe.body.user.isDemo).toBe(true);
    expect(demoMe.body.user.isSuperAdmin).toBe(false);

    const demoSpaces = await visitor.json<{ spaces: { id: string; name: string }[] }>("/api/spaces");
    expect(demoSpaces.body.spaces.map(({ name }) => name)).toContain("Our year in motion");
    const demoSpace = demoSpaces.body.spaces.find(({ name }) => name === "Our year in motion");
    expect(demoSpace).toBeDefined();
    const demoDetail = await visitor.json<{ members: { name: string; role: string; userId: string }[] }>(`/api/spaces/${demoSpace!.id}`);
    expect(demoDetail.body.members.map(({ name }) => name)).toEqual(["Maya Chen", "Leo Tan", "Sam Rivera"]);
    expect(demoDetail.body.members.map(({ role }) => role)).toEqual(["owner", "member", "member"]);
    const demoObjects = await visitor.json<{ objects: { caption: string; uploadedBy: string }[] }>(`/api/spaces/${demoSpace!.id}/objects`);
    expect(demoObjects.body.objects).toHaveLength(18);
    const momentCounts = new Map<string, number>();
    for (const object of demoObjects.body.objects) {
      momentCounts.set(object.uploadedBy, (momentCounts.get(object.uploadedBy) ?? 0) + 1);
    }
    expect(demoDetail.body.members.map(({ userId }) => momentCounts.get(userId))).toEqual([6, 6, 6]);
    const demoStories = await visitor.json<{ stories: { title: string; momentIds: string[]; style: string; styleSource: string; blueprint: { chapters: unknown[] } }[] }>(`/api/spaces/${demoSpace!.id}/stories`);
    expect(demoStories.body.stories).toHaveLength(3);
    expect(demoStories.body.stories.map(({ title }) => title)).toEqual([
      "The year we kept moving",
      "The year we kept moving",
      "The year we kept moving",
    ]);
    expect(demoStories.body.stories.map(({ style }) => style)).toEqual(["cinematic", "classic", "scrapbook"]);
    expect(demoStories.body.stories.map(({ styleSource }) => styleSource)).toEqual(["manual", "manual", "manual"]);
    expect(demoStories.body.stories.every((story) => story.momentIds.length === 18 && story.blueprint.chapters.length === 5)).toBe(true);

    const secondVisitor = new BrowserSession(app);
    expect((await secondVisitor.request("/auth/demo", {
      method: "POST",
      body: JSON.stringify({ personaId: "leo" }),
    })).status).toBe(200);
    const secondDemoMe = await secondVisitor.json<{ user: { email: string; isDemo: boolean } }>("/auth/me");
    expect(secondDemoMe.body.user.email).toBe("demo-leo@zo-moments.example");
    expect(secondDemoMe.body.user.isDemo).toBe(true);
    const secondDemoSpaces = await secondVisitor.json<{ spaces: { id: string }[] }>("/api/spaces");
    expect(secondDemoSpaces.body.spaces.map(({ id }) => id)).toContain(demoSpace!.id);
    expect((await visitor.request("/api/account/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "secret", newPassword: "changed" }),
    })).status).toBe(403);
    expect((await visitor.request("/auth/update-user", {
      method: "POST",
      body: JSON.stringify({ name: "Changed Demo" }),
    })).status).toBe(403);
    expect((await visitor.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: "secret", newPassword: "changed" }),
    })).status).toBe(403);

    const directory = await superAdmin.json<{ users: { email: string }[] }>("/api/admin/users?search=zo-moments.example");
    expect(directory.body.users).toEqual([]);

    const disabled = await superAdmin.json<{ enabled: boolean }>("/api/admin/demo-mode", {
      method: "POST",
      body: JSON.stringify({ enabled: false }),
    });
    expect(disabled.body.enabled).toBe(false);
    expect((await app.request("/auth/demo", { method: "POST" })).status).toBe(403);
  });
});
