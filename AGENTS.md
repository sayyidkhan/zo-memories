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
- Production persistence must go through the `BlobStore` interface and S3-compatible Zo Object Storage. Never add local user-data persistence.
- Development and tests may use `MemoryBlobStore`; production rejects it.

## Commands

- `bun run dev` starts the Vite client and in-memory development API.
- `bun run check` runs all type checks, tests, and the production build.
- `bun run start` starts the production Hono process after the web build exists.

## Security

- Every `/api/*` route must require a Better Auth session.
- Resolve space membership before reading metadata or media.
- Only owners may invite, remove members, or delete a space.
- Only an uploader or space owner may delete a memory.
- Never expose bucket credentials or direct public object URLs.
