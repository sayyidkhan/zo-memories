# Zo Moments

> A shared digital home for the moments that matter.

Zo Moments is a private, mobile-first memory space for couples, families, friends, and other people who share a life. It is built as a Bun monorepo with React 19, Hono, Better Auth, and S3-compatible Zo Object Storage.

## MVP

- Email and password accounts with secure cookie sessions
- Private shared spaces and role-based membership
- Email-bound invitations that activate when the invited person signs in
- Photo, video, audio, PDF, and document uploads
- Chronological timeline, albums, search, preview, and original downloads
- Responsive desktop and mobile interface
- Object-storage-only persistence for both metadata and media

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

Open `http://localhost:5173`. Development explicitly uses an in-memory object store, so test accounts and uploads disappear when the API restarts and nothing is written to the local filesystem.

## Verification

```bash
bun run check
```

This runs TypeScript checks for every workspace, API integration tests, and the production Vite build.

## Production Storage

Production requires an S3-compatible object store. Copy `.env.example`, configure the bucket credentials, set `NODE_ENV=production`, and use a unique `BETTER_AUTH_SECRET` of at least 32 random characters.

The server refuses to start with in-memory storage in production. See [Deployment](docs/DEPLOYMENT.md) for the complete Zo setup.

## Product Documents

- [Product requirements](docs/PRD.md)
- [Technical stack](docs/TECH-STACK.md)
- [Deployment](docs/DEPLOYMENT.md)
