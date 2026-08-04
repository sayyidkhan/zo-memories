# Zo Moments

> A shared digital home for the moments that matter.

Zo Moments is a private, mobile-first memory space for couples, families, friends, and other people who share a life. It is built as a Bun monorepo with React 19, Hono, Better Auth, and Zo persistent server storage.

## MVP

- Email and password accounts with secure cookie sessions
- Private shared spaces and role-based membership
- Email-bound invitations that activate when the invited person signs in
- Photo, video, audio, PDF, and document uploads
- Chronological timeline, albums, search, preview, and original downloads
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

The server refuses to start with in-memory storage in production. S3 remains available as an optional storage driver. See [Deployment](docs/DEPLOYMENT.md) for the complete Zo setup.

## Product Documents

- [Product requirements](docs/PRD.md)
- [Technical stack](docs/TECH-STACK.md)
- [Deployment](docs/DEPLOYMENT.md)
