import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, KeyRound, LockKeyhole, LogOut, Trash2, UserRound } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { User } from "@zo-moments/types";
import { toast } from "sonner";
import { Button, Field, Input, Modal, Spinner } from "./ui";
import { ProfileAvatar } from "./profile-avatar";

function messageFor(error: unknown): string {
  return error instanceof ZoMomentsApiError ? error.message : "Something went wrong";
}

function ErrorMessage({ message }: { message: string }) {
  return message ? <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{message}</p> : null;
}

export function AccountDialog({
  open,
  onClose,
  onSignOut,
  user,
  signingOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
  user: User;
  signingOut: boolean;
}) {
  const queryClient = useQueryClient();
  const passwordForm = useRef<HTMLFormElement>(null);
  const [section, setSection] = useState<"profile" | "password">("profile");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const profile = useMutation({
    mutationFn: (name: string) => api.updateProfile({ name }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["space"] }),
      ]);
      toast.success("Profile updated");
    },
    onError: (error) => setProfileError(messageFor(error)),
  });

  const password = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) => api.changePassword(input),
    onSuccess: () => {
      passwordForm.current?.reset();
      toast.success("Password changed");
    },
    onError: (error) => setPasswordError(messageFor(error)),
  });

  const avatar = useMutation({
    mutationFn: (file: File) => api.uploadAvatar(file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile picture updated");
    },
    onError: (error) => setAvatarError(messageFor(error)),
  });

  const removeAvatar = useMutation({
    mutationFn: () => api.deleteAvatar(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile picture removed");
    },
    onError: (error) => setAvatarError(messageFor(error)),
  });

  function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError("");
    profile.mutate(String(new FormData(event.currentTarget).get("name") ?? ""));
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    const data = new FormData(event.currentTarget);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      setPasswordError("The new passwords do not match");
      return;
    }
    password.mutate({ currentPassword, newPassword });
  }

  return (
    <Modal open={open} onClose={onClose} title="Account settings" description="Manage your profile, picture, and sign-in details." size="lg">
      {section === "profile" ? (
        <>
          <div className="rounded-[26px] border border-[#ded2c2] bg-[#f2e9dc] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
            <div className="flex min-w-0 items-center gap-4">
              <ProfileAvatar user={user} className="size-16 shrink-0" textClassName="text-sm" />
              <div className="min-w-0">
                <strong className="block truncate text-lg text-[#26372f]">{user.name}</strong>
                <span className="mt-0.5 block truncate text-sm text-[#766f65]">{user.email}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#d2c5b3] bg-[#fffaf2] px-4 text-sm font-semibold text-[#34443a] transition hover:bg-[#f5ecdf]">
                <Camera className="size-4" />{avatar.isPending ? "Uploading…" : user.image ? "Change photo" : "Add photo"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={avatar.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setAvatarError("");
                    avatar.mutate(file);
                  }}
                />
              </label>
              {user.image ? <Button className="h-10 px-4 text-sm" variant="ghost" onClick={() => removeAvatar.mutate()} disabled={removeAvatar.isPending}><Trash2 className="size-4" />Remove</Button> : null}
            </div>
          </div>
          <ErrorMessage message={avatarError} />
        </>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-[#eee5d8] p-1" role="tablist" aria-label="Account settings sections">
        <button
          type="button"
          role="tab"
          aria-selected={section === "profile"}
          onClick={() => setSection("profile")}
          className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${section === "profile" ? "bg-[#fffaf2] text-[#26372f] shadow-sm" : "text-[#766f65] hover:text-[#34443a]"}`}
        >
          <UserRound className="size-4" />Profile
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "password"}
          onClick={() => setSection("password")}
          className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${section === "password" ? "bg-[#fffaf2] text-[#26372f] shadow-sm" : "text-[#766f65] hover:text-[#34443a]"}`}
        >
          <KeyRound className="size-4" />Password
        </button>
      </div>

      {section === "profile" ? (
        <section className="mt-6 rounded-[24px] border border-[#e2d7c8] bg-[#fffdf8] p-5 sm:p-6">
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#34443a]">Profile details</h3>
            <p className="mt-1 text-sm text-[#827b70]">This is how you appear to people in your shared spaces.</p>
          </div>
          <form className="grid gap-5" onSubmit={updateProfile}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Display name"><Input name="name" defaultValue={user.name} autoComplete="name" minLength={2} maxLength={80} required /></Field>
              <Field label="Email"><Input value={user.email} disabled readOnly /></Field>
            </div>
            <p className="text-xs leading-5 text-[#827b70]">Your email is used for sign-in and invitations. It cannot be changed yet.</p>
            <ErrorMessage message={profileError} />
            <Button className="justify-self-start" disabled={profile.isPending}>
              {profile.isPending ? <Spinner /> : "Save changes"}
            </Button>
          </form>
        </section>
      ) : (
        <section className="mt-6 rounded-[24px] border border-[#e2d7c8] bg-[#fffdf8] p-5 sm:p-6">
          <div className="mb-6">
            <h3 className="text-base font-bold text-[#34443a]">Change password</h3>
            <p className="mt-1 text-sm text-[#827b70]">Use at least six characters. Other signed-in devices will be logged out.</p>
          </div>
          <form ref={passwordForm} className="grid gap-5" onSubmit={updatePassword}>
            <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" minLength={6} required /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="New password"><Input name="newPassword" type="password" autoComplete="new-password" minLength={6} maxLength={128} required /></Field>
              <Field label="Confirm new password"><Input name="confirmPassword" type="password" autoComplete="new-password" minLength={6} maxLength={128} required /></Field>
            </div>
            <ErrorMessage message={passwordError} />
            <Button className="justify-self-start" disabled={password.isPending}>
              {password.isPending ? <Spinner /> : "Update password"}
            </Button>
          </form>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-[#dfd4c5] pt-5">
        <p className="hidden text-xs text-[#827b70] sm:block">Signed in as {user.email}</p>
        <Button className="ml-auto" variant="ghost" onClick={onSignOut} disabled={signingOut}><LogOut className="size-4" />Sign out</Button>
      </div>
    </Modal>
  );
}
