# Zo Moments

Version: v0.1

---

## Philosophy

Zo Moments is built entirely on Zo Computer.

The application demonstrates how cloud-native consumer applications can be built using Zo services.

Everything revolves around one concept: Shared Spaces.

---

## Architecture

```text
Zo Moments
    |
React Web App
    |
REST API (Hono)
    |
Zo Persistent Storage
```

For the MVP, Zo persistent server storage is the single source of truth.

---

## Frontend

| Area | Choice |
| --- | --- |
| Framework | React 19 |
| Language | TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| State | Zustand |
| Server State | TanStack Query |
| Icons | Lucide |
| Notifications | Sonner |

---

## Backend

| Area | Choice |
| --- | --- |
| Framework | Hono |
| Language | TypeScript |
| Validation | Zod |
| Authentication | Better Auth |
| API | REST |

---

## Storage

Zo persistent server storage stores:

- Photos
- Videos
- Voice notes
- Documents

Data is stored outside the application repository through the shared `BlobStore` boundary.

---

## Deployment

Everything is hosted on Zo.

```text
Browser
  |
Zo Static
  |
Hono
  |
Zo Persistent Storage
```

---

## Repository

```text
apps/
  web/
  api/
packages/
  sdk/
  types/
docs/
```

---

## Shared SDK

The shared SDK supports React, with future support planned for:

- CLI
- Mobile
- Desktop

---

## REST API

### Authentication

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Spaces

- `GET /spaces`
- `POST /spaces`
- `GET /spaces/:id`
- `DELETE /spaces/:id`

### Members

- `POST /spaces/:id/invite`
- `POST /spaces/:id/share-invitation`
- `DELETE /spaces/:id/share-invitation`
- `GET /public/invitations/:token`
- `POST /invitations/:token/accept`
- `GET /spaces/:id/members`
- `DELETE /spaces/:id/members/:userId`

### Objects

- `GET /spaces/:id/objects`
- `POST /spaces/:id/objects`
- `DELETE /spaces/:id/objects/:key`
- `GET /spaces/:id/objects/:key`

### Upload Flow

```text
Select photo
  |
Choose shared space
  |
Upload
  |
Zo Object Storage
  |
Visible to everyone
```

### Preview Flow

```text
Photo
  |
REST API
  |
Zo Storage
  |
Browser
```

---

## Security

Authentication is required for space membership and content access. A shareable invitation exposes only the space and inviter names; it is single-use, expires after 30 days, and can be revoked. Every object belongs to exactly one shared space, and only members of that space can access its contents.

---

## Future

### Version 2

- AI Timeline
- AI Story Generator
- AI Search
- OCR
- Face Grouping

### Version 3

- Mobile App
- Desktop App
- Offline Sync
- Shared Calendar
- Anniversary Movies

---

## Engineering Principles

- Cloud Native
- API First
- Blob Storage First
- Shared Spaces
- Mobile Friendly
- Type Safe
- One Deployment
- Built entirely on Zo
