# Zo Moments Deployment

Version: v0.1

## Runtime

Zo Moments deploys as one public Zo HTTP service. The Hono process serves the REST API, Better Auth endpoints, and the built React application from the same origin.

## Prerequisites

- An S3-compatible Zo Object Storage bucket
- Bucket access key and secret
- The bucket endpoint and region
- A public HTTPS URL for the service

## Required Environment

```dotenv
NODE_ENV=production
STORAGE_DRIVER=s3
BETTER_AUTH_SECRET=<at-least-32-random-characters>
BETTER_AUTH_URL=https://<service-url>
APP_ORIGIN=https://<service-url>
S3_BUCKET=<bucket-name>
S3_ACCESS_KEY_ID=<access-key>
S3_SECRET_ACCESS_KEY=<secret-key>
S3_ENDPOINT=<s3-compatible-endpoint>
S3_REGION=auto
MAX_UPLOAD_BYTES=104857600
```

Store secrets in Zo's service environment. Do not create or commit a `.env` file with live credentials.

## Build

```bash
bun install --frozen-lockfile
bun run check
```

The production web build is written to `apps/web/dist` and served by Hono.

## Service

Create a public Zo HTTP service with:

- Working directory: `/home/workspace/Start/garden-of-zo/zo-memories`
- Entrypoint: `bun run start`
- Local port: any available HTTP port; Zo passes it through `PORT`
- Environment: all variables listed above

Verify the deployment with `GET /health`. A healthy response is:

```json
{
  "status": "ok",
  "storage": "s3"
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
  media/<space-id>/<object-id>/<filename>
```

All objects remain private. Media is streamed through authenticated API routes after membership checks.

## MVP Constraints

- Invitations are email-bound access reservations; v0.1 does not send transactional email.
- Metadata queries scan JSON records under a collection prefix. This is suitable for an MVP and small shared spaces, not high-volume multi-tenant workloads.
- S3 does not provide multi-object transactions. A later scale phase should move auth and metadata indexes to a transactional Zo database while keeping media in object storage.
