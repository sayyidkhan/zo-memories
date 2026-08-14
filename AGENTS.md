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
- The POC exposes three presentation styles: `classic`, `scrapbook`, and `cinematic`. Auto and optional AI suggestions choose only among those three. Legacy `flipbook` or `comic` records remain readable through a Classic compatibility fallback, but cannot be created. AI receives only selected moment metadata, never media bytes.
- Mobile is the primary product surface. Keep the app header and view switcher sticky, expose Add moments and Craft a story in the phone bottom dock, render task dialogs as full-height sheets, and preserve the export order: configure, generate, preview, then share or download. Desktop layouts are progressive enhancements of the same flows.
- Social exports preserve the selected story style but create a distinct reusable master for each destination and placement. Image exports are numbered PNG carousels (cover, sequenced moment slides, closing card) with destination-specific slide limits; video exports remain single H.264 MP4 stories. Dimensions, safe areas, pacing, crop intensity, photo count, and bitrate adapt to Instagram, Facebook, TikTok, YouTube Shorts, LinkedIn, X, Threads, Pinterest, WhatsApp, or Snapchat. The first destination selection generates or opens its preview; selecting that destination again downloads the full sequence. Exports remain private to shared-space members, support multi-file native device sharing, and are deleted with their story.
- Story creators and space owners edit completed stories directly on the rendered canvas. Title, place, display date, opening, scene titles, and scene metadata are detached story overrides that autosave without mutating source moments. Each save snapshots the previous canvas for version-history restore; generated social exports are cleared and regenerated from the current overrides. Media references remain attached until media replacement is implemented.
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
