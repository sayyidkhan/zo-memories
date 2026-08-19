# Zo Moments

> A shared digital home for the moments that matter.

Zo Moments is a private, mobile-first memory space for couples, families, friends, and other people who share a life. It is built as a Bun monorepo with React 19, Hono, Better Auth, and Zo persistent server storage.

## MVP

- Email and password accounts with secure cookie sessions
- Private profile-picture upload and account settings
- Application admin console for user roles and account suspension
- Super-admin-controlled passwordless demo personas sharing one travel journal
- Private shared spaces and role-based membership
- Single-use invitation links for WhatsApp, Telegram, SMS, and native sharing
- Photo, video, audio, PDF, and document uploads
- Chronological timeline, albums, search, preview, and original downloads
- Guided onboarding from shared space to collaborative story
- Canonical journey blueprints with a summary, narrative chapters, story beats, assigned moments, and closing reflection
- Interactive storybooks with direct canvas editing, autosave, repository-backed version history, and switchable Classic, Scrapbook, and Cinematic themes
- Optional Luna-assisted story drafting from private moment metadata, with a deterministic non-AI fallback
- Private destination-specific social exports: lightweight JPEG story carousels for image posts and H.264 MP4 stories for video placements, with immediate local preview, background persistence, and multi-file native device sharing
- Responsive desktop and mobile interface
- Persistent Zo storage for both metadata and media

## Repository

```text
apps/
  api/       Hono REST API, Better Auth, and object storage
  web/       React application
packages/
  sdk/       Shared browser/API client
  types/     Zod schemas and TypeScript contracts
docs/
  PRD.md
  TECH-STACK.md
  DEPLOYMENT.md
```

## Development

```bash
bun install
bun run dev
```

Open `http://localhost:5173`. Development explicitly uses an in-memory store, so test accounts and uploads disappear when the API restarts.

## Verification

```bash
bun run check
```

This runs TypeScript checks for every workspace, API integration tests, and the production Vite build.

## Production

Production uses `FileSystemBlobStore` with data outside the repository in the sibling `zo-memories-data` directory. The app runs as an internal Zo process service and is exposed at `/moments` by the public Zo Router gateway.

Application administrators are explicitly bootstrapped through `ADMIN_EMAILS`. They can manage account access and roles, but do not bypass shared-space membership or gain access to private memories. Only these bootstrap super administrators can enable or disable public demo access.

The server refuses to start with in-memory storage in production. S3 remains available as an optional storage driver. See [Deployment](docs/DEPLOYMENT.md) for the complete Zo setup.

## Product Documents

- [Product requirements](docs/PRD.md)
- [Technical stack](docs/TECH-STACK.md)
- [Deployment](docs/DEPLOYMENT.md)
