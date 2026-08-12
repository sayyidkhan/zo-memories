import { z } from "zod";

export const isoDateSchema = z.string().datetime();

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable().optional(),
  role: z.enum(["user", "admin"]).optional(),
  banned: z.boolean().nullable().optional(),
  isSuperAdmin: z.boolean().optional(),
  isDemo: z.boolean().optional(),
});

export const appRoleSchema = z.enum(["user", "admin"]);
export const accountStatusSchema = z.enum(["active", "suspended"]);

export const avatarSchema = z.object({
  id: z.string(),
  userId: z.string(),
  storageKey: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
  updatedAt: isoDateSchema,
});

export const adminUserSchema = userSchema.extend({
  role: appRoleSchema,
  status: accountStatusSchema,
  banReason: z.string().nullable(),
  createdAt: isoDateSchema,
  spaceCount: z.number().int().nonnegative(),
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

export const shareInvitationStatusSchema = z.enum(["active", "accepted", "revoked"]);

export const shareInvitationSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  token: z.string(),
  invitedBy: z.string(),
  status: shareInvitationStatusSchema,
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
  acceptedAt: isoDateSchema.nullable(),
  acceptedBy: z.string().nullable(),
});

export const shareInvitationPreviewSchema = z.object({
  spaceId: z.string(),
  spaceName: z.string(),
  inviterName: z.string(),
  status: z.enum(["active", "accepted", "revoked", "expired"]),
  expiresAt: isoDateSchema,
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

export const createShareInvitationSchema = z.object({
  regenerate: z.boolean().optional().default(false),
});

export const createAlbumSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(128),
  newPassword: z.string().min(6).max(128),
});

export const updateAdminRoleSchema = z.object({
  role: appRoleSchema,
});

export const updateAccountStatusSchema = z.object({
  status: accountStatusSchema,
  reason: z.string().trim().max(240).optional(),
});

export const demoModeSchema = z.object({
  enabled: z.boolean(),
  updatedAt: isoDateSchema.nullable(),
  updatedBy: z.string().nullable(),
});

export const updateDemoModeSchema = z.object({
  enabled: z.boolean(),
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
export type AppRole = z.infer<typeof appRoleSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export type Avatar = z.infer<typeof avatarSchema>;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type Space = z.infer<typeof spaceSchema>;
export type SpaceSummary = z.infer<typeof spaceSummarySchema>;
export type SpaceDetail = z.infer<typeof spaceDetailSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type ShareInvitation = z.infer<typeof shareInvitationSchema>;
export type ShareInvitationPreview = z.infer<typeof shareInvitationPreviewSchema>;
export type Album = z.infer<typeof albumSchema>;
export type ObjectKind = z.infer<typeof objectKindSchema>;
export type MomentObject = z.infer<typeof momentObjectSchema>;
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateShareInvitationInput = z.infer<typeof createShareInvitationSchema>;
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateAdminRoleInput = z.infer<typeof updateAdminRoleSchema>;
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;
export type DemoMode = z.infer<typeof demoModeSchema>;
export type UpdateDemoModeInput = z.infer<typeof updateDemoModeSchema>;
