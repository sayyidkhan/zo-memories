# Zo Moments Deployment

Version: v0.1

## Runtime

Zo Moments runs as an internal Zo process service on `127.0.0.1:8790`. The public Zo Router gateway exposes it at `/moments` and strips that prefix before proxying to Hono. Hono serves the REST API, Better Auth endpoints, and built React application.

## Prerequisites

- Zo's persistent server storage
- The public Zo Router gateway
- A unique Better Auth secret of at least 32 random characters

## Required Environment

```dotenv
NODE_ENV=production
STORAGE_DRIVER=filesystem
STORAGE_ROOT=/home/workspace/Start/garden-of-zo/zo-memories-data
BETTER_AUTH_SECRET=<at-least-32-random-characters>
BETTER_AUTH_URL=https://public-apps-sayyidkhan.zocomputer.io
APP_ORIGIN=https://public-apps-sayyidkhan.zocomputer.io
APP_BASE_PATH=/moments
ADMIN_EMAILS=<comma-separated-initial-admin-email-addresses>
PORT=8790
MAX_UPLOAD_BYTES=104857600
```

The deployed service loads `BETTER_AUTH_SECRET` from a mode `0600` file in the data directory. Never commit that file.

## Build

```bash
bun install --frozen-lockfile
APP_BASE_PATH=/moments bun run check
```

The production web build is written to `apps/web/dist` and served by Hono.

## Service

Create a Zo process service with:

- Working directory: `/home/workspace/Start/garden-of-zo/zo-memories`
- Entrypoint: `bash -c 'set -a; source /home/workspace/Start/garden-of-zo/zo-memories-data/service.env; set +a; bun run build && exec bun run start'`
- Fixed local port: `8790`
- Router mapping: `/moments` to `http://127.0.0.1:8790` with `stripPrefix: true`

Verify the deployment through `GET /moments/health`. A healthy response is:

```json
{
  "status": "ok",
  "storage": "filesystem"
}
```

## Object Layout

```text
zo-moments/
  records/
    auth/<model>/<id>.json
    spaces/<id>.json
    members/<id>.json
    invitations/<id>.json
    albums/<id>.json
    objects/<id>.json
    avatars/<user-id>.json
    auth/user/<id>.json
      # Includes Better Auth role and suspension state
  media/<space-id>/<object-id>/<filename>
  profile-images/<user-id>/<version>.<extension>
```

The data directory is not served by Zo Router. Media is streamed through authenticated API routes after membership checks.

`ADMIN_EMAILS` is the recovery-safe source for initial administrators. Matching signed-in accounts are promoted automatically and cannot be demoted in the Admin Console. Other administrators may be promoted or demoted in the application. Administrators can manage account access but cannot open shared spaces unless they are members.

## MVP Constraints

- Invitations are email-bound access reservations; v0.1 does not send transactional email.
- Metadata queries scan JSON records under a collection prefix. This is suitable for an MVP and small shared spaces, not high-volume multi-tenant workloads.
- Filesystem records do not provide multi-object transactions. A later scale phase should move auth and metadata indexes to a transactional Zo database while keeping media in blob storage.
