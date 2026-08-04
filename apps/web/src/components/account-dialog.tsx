import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { User } from "@zo-moments/types";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { Button, Field, Input, Modal, Spinner } from "./ui";

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
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
    <Modal open={open} onClose={onClose} title="Your account" description="Review your profile and keep your sign-in details secure.">
      <div className="mb-7 flex items-center gap-4 rounded-[22px] bg-[#eee5d8] p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#6e8478] text-sm font-bold text-white">{initials(user.name)}</span>
        <div className="min-w-0">
          <strong className="block truncate text-base text-[#26372f]">{user.name}</strong>
          <span className="block truncate text-sm text-[#766f65]">{user.email}</span>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2 text-[#34443a]">
          <UserRound className="size-4" />
          <h3 className="text-sm font-bold">Profile details</h3>
        </div>
        <form className="grid gap-4" onSubmit={updateProfile}>
          <Field label="Display name"><Input name="name" defaultValue={user.name} autoComplete="name" minLength={2} maxLength={80} required /></Field>
          <Field label="Email" hint="Your email identifies your account and controls shared-space invitations."><Input value={user.email} disabled readOnly /></Field>
          <ErrorMessage message={profileError} />
          <Button className="justify-self-start" variant="secondary" disabled={profile.isPending}>
            {profile.isPending ? <Spinner /> : "Save profile"}
          </Button>
        </form>
      </section>

      <div className="my-7 h-px bg-[#dfd4c5]" />

      <section>
        <div className="mb-4 flex items-center gap-2 text-[#34443a]">
          <KeyRound className="size-4" />
          <h3 className="text-sm font-bold">Password</h3>
        </div>
        <form ref={passwordForm} className="grid gap-4" onSubmit={updatePassword}>
          <Field label="Current password"><Input name="currentPassword" type="password" autoComplete="current-password" minLength={8} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password"><Input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></Field>
            <Field label="Confirm password"><Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></Field>
          </div>
          <p className="flex items-center gap-2 text-xs leading-5 text-[#827b70]"><LockKeyhole className="size-3.5 shrink-0" />Use at least eight characters. Other signed-in devices will be logged out.</p>
          <ErrorMessage message={passwordError} />
          <Button className="justify-self-start" variant="secondary" disabled={password.isPending}>
            {password.isPending ? <Spinner /> : "Change password"}
          </Button>
        </form>
      </section>

      <div className="mt-8 flex items-center justify-between border-t border-[#dfd4c5] pt-5">
        <p className="text-xs text-[#827b70]">Signed in as {user.email}</p>
        <Button variant="ghost" onClick={onSignOut} disabled={signingOut}><LogOut className="size-4" />Sign out</Button>
      </div>
    </Modal>
  );
}
