import type {
  AdminUser,
  Album,
  ChangePasswordInput,
  DemoMode,
  DemoLoginInput,
  CreateAlbumInput,
  CreateShareInvitationInput,
  CreateSpaceInput,
  CreateStoryInput,
  InviteMemberInput,
  Invitation,
  LoginInput,
  Member,
  MomentObject,
  RegisterInput,
  ShareInvitation,
  ShareInvitationPreview,
  SpaceDetail,
  SpaceSummary,
  Story,
  StoryStyle,
  SuggestStoryStyleInput,
  UpdateProfileInput,
  UpdateAccountStatusInput,
  UpdateAdminRoleInput,
  UpdateDemoModeInput,
  User,
} from "@zo-moments/types";

export class ZoMomentsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ZoMomentsApiError";
  }
}

export interface ListObjectsInput {
  albumId?: string;
  search?: string;
}

export interface UploadObjectInput {
  spaceId: string;
  file: File;
  albumId?: string;
  caption?: string;
  occurredAt?: string;
}

export type SocialExportPreset =
  | "instagram-feed"
  | "facebook-feed"
  | "linkedin-feed"
  | "x-post"
  | "threads-post"
  | "pinterest-pin"
  | "instagram-reels"
  | "facebook-reels"
  | "tiktok"
  | "youtube-shorts"
  | "whatsapp-status"
  | "x-vertical"
  | "snapchat";

export type SocialExportStatus = Record<SocialExportPreset, boolean>;

export interface ZoMomentsClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export class ZoMomentsClient {
  private readonly baseUrl: string;
  private readonly requestFetch: typeof globalThis.fetch;

  constructor(options: ZoMomentsClientOptions = {}) {
    this.baseUrl = options.baseUrl?.replace(/\/$/, "") ?? "";
    this.requestFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const response = await this.requestFetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; code?: string }
        | null;
      throw new ZoMomentsApiError(
        body?.error ?? body?.message ?? `Request failed with status ${response.status}`,
        response.status,
        body?.code,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  register(input: RegisterInput): Promise<{ user: User }> {
    return this.request("/auth/register", { method: "POST", body: JSON.stringify(input) });
  }

  login(input: LoginInput): Promise<{ user: User }> {
    return this.request("/auth/login", { method: "POST", body: JSON.stringify(input) });
  }

  demoLogin(input: DemoLoginInput): Promise<{ user: User }> {
    return this.request("/auth/demo", { method: "POST", body: JSON.stringify(input) });
  }

  getDemoMode(): Promise<DemoMode> {
    return this.request("/public/demo-mode");
  }

  logout(): Promise<void> {
    return this.request("/auth/logout", { method: "POST" });
  }

  me(): Promise<{ user: User }> {
    return this.request("/auth/me");
  }

  updateProfile(input: UpdateProfileInput): Promise<{ status: boolean }> {
    return this.request("/api/account/profile", { method: "POST", body: JSON.stringify(input) });
  }

  changePassword(input: ChangePasswordInput): Promise<{ token: string | null; user: User }> {
    return this.request("/api/account/password", { method: "POST", body: JSON.stringify(input) });
  }

  uploadAvatar(file: File): Promise<{ image: string }> {
    const body = new FormData();
    body.set("file", file);
    return this.request("/api/account/avatar", { method: "POST", body });
  }

  deleteAvatar(): Promise<void> {
    return this.request("/api/account/avatar", { method: "DELETE" });
  }

  avatarUrl(userId: string, version?: string | null): string {
    const query = version ? `?v=${encodeURIComponent(version)}` : "";
    return `${this.baseUrl}/api/users/${encodeURIComponent(userId)}/avatar${query}`;
  }

  listAdminUsers(search = ""): Promise<{ users: AdminUser[]; total: number }> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.request(`/api/admin/users${query}`);
  }

  updateAdminRole(userId: string, input: UpdateAdminRoleInput): Promise<{ user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateAccountStatus(userId: string, input: UpdateAccountStatusInput): Promise<{ user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getAdminDemoMode(): Promise<DemoMode> {
    return this.request("/api/admin/demo-mode");
  }

  updateDemoMode(input: UpdateDemoModeInput): Promise<DemoMode> {
    return this.request("/api/admin/demo-mode", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listSpaces(): Promise<{ spaces: SpaceSummary[] }> {
    return this.request("/api/spaces");
  }

  createSpace(input: CreateSpaceInput): Promise<{ space: SpaceDetail["space"] }> {
    return this.request("/api/spaces", { method: "POST", body: JSON.stringify(input) });
  }

  getSpace(spaceId: string): Promise<SpaceDetail> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}`);
  }

  deleteSpace(spaceId: string): Promise<void> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}`, { method: "DELETE" });
  }

  inviteMember(spaceId: string, input: InviteMemberInput): Promise<{ invitation: Invitation }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/invite`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createShareInvitation(
    spaceId: string,
    input: CreateShareInvitationInput = { regenerate: false },
  ): Promise<{ invitation: ShareInvitation }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/share-invitation`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  revokeShareInvitation(spaceId: string): Promise<void> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/share-invitation`, {
      method: "DELETE",
    });
  }

  getShareInvitation(token: string): Promise<{ invitation: ShareInvitationPreview }> {
    return this.request(`/public/invitations/${encodeURIComponent(token)}`);
  }

  acceptShareInvitation(token: string): Promise<{ space: SpaceDetail["space"] }> {
    return this.request(`/api/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });
  }

  listMembers(spaceId: string): Promise<{ members: Member[]; invitations: Invitation[] }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/members`);
  }

  removeMember(spaceId: string, userId: string): Promise<void> {
    return this.request(
      `/api/spaces/${encodeURIComponent(spaceId)}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
  }

  listAlbums(spaceId: string): Promise<{ albums: Album[] }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/albums`);
  }

  createAlbum(spaceId: string, input: CreateAlbumInput): Promise<{ album: Album }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/albums`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  deleteAlbum(spaceId: string, albumId: string): Promise<void> {
    return this.request(
      `/api/spaces/${encodeURIComponent(spaceId)}/albums/${encodeURIComponent(albumId)}`,
      { method: "DELETE" },
    );
  }

  listStories(spaceId: string): Promise<{ stories: Story[] }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/stories`);
  }

  createStory(spaceId: string, input: CreateStoryInput): Promise<{ story: Story }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/stories`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  suggestStoryStyle(spaceId: string, input: SuggestStoryStyleInput): Promise<{ style: StoryStyle; rationale: string; source: "ai" | "auto" }> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/stories/suggest-style`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  deleteStory(spaceId: string, storyId: string): Promise<void> {
    return this.request(
      `/api/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}`,
      { method: "DELETE" },
    );
  }

  getSocialExports(spaceId: string, storyId: string): Promise<SocialExportStatus> {
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}/social-exports`);
  }

  uploadSocialExport(spaceId: string, storyId: string, preset: SocialExportPreset, file: File): Promise<{ preset: SocialExportPreset; format: "image" | "video"; contentType: string; url: string }> {
    const body = new FormData();
    body.set("preset", preset);
    body.set("file", file);
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}/social-exports`, { method: "POST", body });
  }

  socialExportUrl(spaceId: string, storyId: string, preset: SocialExportPreset, download = false): string {
    const query = download ? "?download=1" : "";
    return `${this.baseUrl}/api/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}/social-exports/${preset}${query}`;
  }

  listObjects(spaceId: string, input: ListObjectsInput = {}): Promise<{ objects: MomentObject[] }> {
    const params = new URLSearchParams();
    if (input.albumId) params.set("albumId", input.albumId);
    if (input.search) params.set("search", input.search);
    const query = params.size ? `?${params.toString()}` : "";
    return this.request(`/api/spaces/${encodeURIComponent(spaceId)}/objects${query}`);
  }

  uploadObject(input: UploadObjectInput): Promise<{ object: MomentObject }> {
    const body = new FormData();
    body.set("file", input.file);
    if (input.albumId) body.set("albumId", input.albumId);
    if (input.caption) body.set("caption", input.caption);
    if (input.occurredAt) body.set("occurredAt", input.occurredAt);
    return this.request(`/api/spaces/${encodeURIComponent(input.spaceId)}/objects`, {
      method: "POST",
      body,
    });
  }

  deleteObject(spaceId: string, objectId: string): Promise<void> {
    return this.request(
      `/api/spaces/${encodeURIComponent(spaceId)}/objects/${encodeURIComponent(objectId)}`,
      { method: "DELETE" },
    );
  }

  objectContentUrl(spaceId: string, objectId: string, download = false): string {
    const suffix = download ? "?download=1" : "";
    return `${this.baseUrl}/api/spaces/${encodeURIComponent(spaceId)}/objects/${encodeURIComponent(objectId)}${suffix}`;
  }
}

function browserBaseUrl(): string {
  if (typeof document === "undefined") return "";
  return document.querySelector<HTMLMetaElement>('meta[name="application-base-path"]')?.content.replace(/\/$/, "") ?? "";
}

export const api = new ZoMomentsClient({ baseUrl: browserBaseUrl() });
