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
- Every story persists one canonical journey blueprint: summary, 1-8 chronological chapters, narrative beat, narration, assigned moment IDs, and closing reflection. Story content is independent of its output and theme.
- The POC outputs an interactive storybook, destination-specific JPEG carousel, or vertical MP4. `classic`, `scrapbook`, and `cinematic` are switchable themes shared by those outputs, not separate stories. Auto and optional AI suggestions choose only among those three. Legacy `flipbook` or `comic` records remain readable through a Classic compatibility fallback, but cannot be created.
- Story text is editable inline by shared-space members, autosaves after a short pause, and retains the 20 most recent previous versions. Content or theme changes invalidate stored social exports.
- Optional AI story drafting uses GPT-5.6 Luna by default and receives only selected moment metadata, never media bytes. A deterministic local blueprint remains available when AI is unavailable.
- Mobile is the primary product surface. Keep the app header and view switcher sticky, expose Add moments and Craft a story in the phone bottom dock, render task dialogs as full-height sheets, and preserve the export order: configure, generate, preview, then share or download. Desktop layouts are progressive enhancements of the same flows.
- Social exports preserve the selected story style but create a distinct reusable master for each destination and placement. New image exports are numbered high-quality JPEG carousels with a full-bleed hook cover, alternating editorial chapter layouts, and a reflective closing card; legacy PNG exports remain readable. Carousel length grows with the selected photo count up to each destination's limit (20 for Instagram, Threads, and LinkedIn; 10 for Facebook and Pinterest; 4 for X), and balanced collage slides retain every selected photo when a limit is reached. Video exports remain single H.264 MP4 stories. Dimensions, safe areas, pacing, crop intensity, photo count, and bitrate adapt to Instagram, Facebook, TikTok, YouTube Shorts, LinkedIn, X, Threads, Pinterest, WhatsApp, or Snapchat. The first destination selection renders a local preview immediately, then saves its reusable master in the background; selecting that destination again downloads the full sequence. Users can edit the post caption sent with the native share sheet. Browsers without file sharing download the media and copy that caption instead. A background-save failure must never discard or block the local preview. Exports remain private to shared-space members, support multi-file native device sharing, and are deleted with their story.
- Story creators and space owners edit completed stories directly on the rendered canvas. Title, place, display date, opening, scene titles, and scene metadata are detached story overrides that autosave without mutating source moments. Each save snapshots the previous canvas for version-history restore; generated social exports are cleared and regenerated from the current overrides. Media references remain attached until media replacement is implemented.
- A first story is automatically drafted when a non-demo space reaches its first 3-5 uploaded photos. It uses the deterministic metadata-only drafting path, then opens in the cinematic creation reveal so users finish their first session with an editable artefact.
- Demo personas open directly into the finished Cinematic example. Story chapters include capped five-second voice-note excerpts when audio moments are present and show a route interlude between chapters when a location is set.
- Motion exports use a deterministic director's plan informed by the useful architectural principle in MUSE: one story arc drives scene duration, camera grammar, transition energy, visual payoff, and soundtrack cues. This is implemented locally from the user's existing moments; it does not call or copy MUSE's Gemini, Veo, or Lyria stack. The soundtrack is generated in-browser, so it adds no third-party asset or licensing dependency; previews start muted and can be unmuted deliberately.
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
