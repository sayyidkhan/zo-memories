import { beforeAll, describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import { MemoryBlobStore } from "../src/storage/blob-store";

process.env.NODE_ENV = "test";
process.env.STORAGE_DRIVER = "memory";
process.env.BETTER_AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
process.env.BETTER_AUTH_URL = "http://localhost";
process.env.APP_ORIGIN = "http://localhost";

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

    const forbidden = await member.request(`/api/spaces/${spaceId}/objects/${upload.body.object.id}`, { method: "DELETE" });
    expect(forbidden.status).toBe(403);

    const removed = await owner.request(`/api/spaces/${spaceId}/objects/${upload.body.object.id}`, { method: "DELETE" });
    expect(removed.status).toBe(204);
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
      body: JSON.stringify({ name: "Old Name", email: "profile@example.com", password: "password123" }),
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
      body: JSON.stringify({ currentPassword: "password123", newPassword: "new-password-456" }),
    });
    expect(password.status).toBe(200);

    expect((await account.request("/auth/logout", { method: "POST" })).status).toBe(200);
    expect((await account.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "profile@example.com", password: "password123" }),
    })).status).toBe(401);
    expect((await account.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "profile@example.com", password: "new-password-456" }),
    })).status).toBe(200);
  });
});
