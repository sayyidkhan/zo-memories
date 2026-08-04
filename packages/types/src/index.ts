import { z } from "zod";

export const isoDateSchema = z.string().datetime();

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable().optional(),
});

export const memberRoleSchema = z.enum(["owner", "member"]);

export const spaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const memberSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: memberRoleSchema,
  joinedAt: isoDateSchema,
});

export const invitationSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  email: z.string().email(),
  role: z.literal("member"),
  invitedBy: z.string(),
  status: z.enum(["pending", "accepted"]),
  createdAt: isoDateSchema,
  acceptedAt: isoDateSchema.nullable(),
});

export const albumSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdBy: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const objectKindSchema = z.enum(["photo", "video", "audio", "document"]);

export const momentObjectSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  albumId: z.string().nullable(),
  storageKey: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  kind: objectKindSchema,
  caption: z.string().nullable(),
  uploadedBy: z.string(),
  createdAt: isoDateSchema,
  occurredAt: isoDateSchema,
});

export const createSpaceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const createAlbumSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

export const spaceSummarySchema = spaceSchema.extend({
  role: memberRoleSchema,
  memberCount: z.number().int().nonnegative(),
  objectCount: z.number().int().nonnegative(),
  latestObject: momentObjectSchema.nullable(),
});

export const spaceDetailSchema = z.object({
  space: spaceSchema,
  membership: memberSchema,
  members: z.array(memberSchema),
  invitations: z.array(invitationSchema),
  albums: z.array(albumSchema),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type Space = z.infer<typeof spaceSchema>;
export type SpaceSummary = z.infer<typeof spaceSummarySchema>;
export type SpaceDetail = z.infer<typeof spaceDetailSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type Album = z.infer<typeof albumSchema>;
export type ObjectKind = z.infer<typeof objectKindSchema>;
export type MomentObject = z.infer<typeof momentObjectSchema>;
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
