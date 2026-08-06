import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import type { BlobStore } from "./storage/blob-store";
import { objectStoreAdapter } from "./storage/auth-adapter";

export function createAuth(store: BlobStore) {
  const trustedOrigins = [process.env.APP_ORIGIN ?? "http://localhost:5173"];
  if (process.env.NODE_ENV !== "production") {
    trustedOrigins.push("http://localhost:5173", "http://127.0.0.1:5173");
  }

  return betterAuth({
    appName: "Zo Moments",
    basePath: "/auth",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: objectStoreAdapter(store),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    trustedOrigins: [...new Set(trustedOrigins)],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];
