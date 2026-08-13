# Zo Moments Project Guide

## Product Contract

- `docs/PRD.md` defines the v0.1 product scope and user experience.
- `docs/TECH-STACK.md` defines the required stack and repository boundaries.
- `docs/DEPLOYMENT.md` defines the production runtime and storage contract.

## Architecture

- `apps/web` is the React 19, Vite, Tailwind, Zustand, and TanStack Query client.
- `apps/api` is the Hono API and Better Auth server.
- `packages/types` owns shared Zod schemas and domain types.
- `packages/sdk` owns the transport client used by web and future clients.
- Production persistence goes through `FileSystemBlobStore` into the sibling `zo-memories-data` directory on Zo's persistent server storage.
- Better Auth's admin plugin owns application roles and suspension state. `ADMIN_EMAILS` promotes configured accounts; app admins never bypass shared-space membership.
- `ADMIN_EMAILS` accounts are super administrators and exclusively control the persistent public demo-mode switch. Three locked demo personas share one restored sample travel space, with seeded memories attributed across them.
- Stories persist a resolved presentation style (`classic`, `flipbook`, `comic`, `scrapbook`, or `cinematic`) and record whether it came from Auto, a manual choice, or an optional AI suggestion. Auto is local and private; AI receives only selected moment metadata, never media bytes.
- Social exports preserve the selected story style but create a distinct reusable master for each destination and placement. Dimensions, safe areas, pacing, crop intensity, photo count, and video bitrate adapt to Instagram, Facebook, TikTok, YouTube Shorts, LinkedIn, X, Threads, Pinterest, WhatsApp, or Snapchat. The first destination selection generates or opens its preview; selecting that destination again downloads it. Exports remain private to shared-space members, support native device sharing, and are deleted with their story.
- Profile images are private blobs under `zo-moments/profile-images` and are streamed only through authenticated API routes.
- Development and tests may use `MemoryBlobStore`; production rejects it. S3 remains an optional `BlobStore` driver.

## Commands

- `bun run dev` starts the Vite client and in-memory development API.
- `bun run check` runs all type checks, tests, and the production build.
- `bun run start` starts the production Hono process after the web build exists.

## Security

- Every `/api/*` route must require a Better Auth session.
- Resolve space membership before reading metadata or media.
- Only owners may invite, remove members, or delete a space.
- Only an uploader or space owner may delete a memory.
- Never expose storage paths or direct public object URLs.
- Never make the first registrant an implicit administrator; bootstrap admins explicitly with `ADMIN_EMAILS`.
- Admins cannot change their own role or suspend themselves through the application.
