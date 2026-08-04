import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, ShieldOff, UserCog, UserRoundCheck, UserRoundX } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { AdminUser, User } from "@zo-moments/types";
import { toast } from "sonner";
import { Button, EmptyState, Input, Modal, Spinner } from "./ui";
import { ProfileAvatar } from "./profile-avatar";

function messageFor(error: unknown): string {
  return error instanceof ZoMomentsApiError ? error.message : "Something went wrong";
}

function joinedLabel(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export function AdminDialog({ open, onClose, currentUser }: { open: boolean; onClose: () => void; currentUser: User }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const users = useQuery({
    queryKey: ["admin-users", deferredSearch],
    queryFn: () => api.listAdminUsers(deferredSearch),
    enabled: open,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["me"] }),
    ]);
  };

  const role = useMutation({
    mutationFn: ({ user, nextRole }: { user: AdminUser; nextRole: "user" | "admin" }) => api.updateAdminRole(user.id, { role: nextRole }),
    onSuccess: async () => {
      await refresh();
      toast.success("Administrator role updated");
    },
    onError: (error) => toast.error(messageFor(error)),
  });

  const status = useMutation({
    mutationFn: ({ user, nextStatus }: { user: AdminUser; nextStatus: "active" | "suspended" }) => api.updateAccountStatus(user.id, { status: nextStatus }),
    onSuccess: async (_result, variables) => {
      await refresh();
      toast.success(variables.nextStatus === "active" ? "Account reactivated" : "Account suspended");
    },
    onError: (error) => toast.error(messageFor(error)),
  });

  function toggleStatus(user: AdminUser) {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    if (nextStatus === "suspended" && !window.confirm(`Suspend ${user.name}? They will be signed out and unable to sign in.`)) return;
    status.mutate({ user, nextStatus });
  }

  return (
    <Modal open={open} onClose={onClose} title="Admin console" description="Manage who can use Zo Moments. Admin access does not reveal private shared-space content." size="xl">
      <div className="mb-5 grid gap-4 rounded-[24px] bg-[#eee5d8] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="relative block">
          <Search className="absolute left-4 top-4 size-4 text-[#827a70]" />
          <Input aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" className="pl-11" />
        </label>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#657067]">
          <UserCog className="size-4" />{users.data?.total ?? 0} {(users.data?.total ?? 0) === 1 ? "account" : "accounts"}
        </div>
      </div>

      {users.isPending ? <div className="grid min-h-64 place-items-center text-[#607066]"><Spinner /></div> : null}
      {users.isError ? <EmptyState icon={<ShieldOff className="size-7" />} title="Users could not load" body={messageFor(users.error)} /> : null}
      {!users.isPending && !users.isError && !users.data?.users.length ? (
        <EmptyState icon={<UserCog className="size-7" />} title="No users found" body="Try a different name or email address." />
      ) : null}

      <div className="grid gap-3">
        {users.data?.users.map((user) => {
          const isSelf = user.id === currentUser.id;
          const busy = (role.isPending && role.variables?.user.id === user.id) || (status.isPending && status.variables?.user.id === user.id);
          return (
            <article key={user.id} className="grid gap-4 rounded-[24px] border border-[#ded3c4] bg-[#fffdf8] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <ProfileAvatar user={user} className="size-12" textClassName="text-xs" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-sm text-[#26372f]">{user.name}</strong>
                    {isSelf ? <span className="rounded-full bg-[#e4d8c5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#685e51]">You</span> : null}
                    {user.role === "admin" ? <span className="inline-flex items-center gap-1 rounded-full bg-[#dbe7de] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#375245]"><ShieldCheck className="size-3" />Admin</span> : null}
                    {user.status === "suspended" ? <span className="rounded-full bg-[#f3d8d1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#873b2f]">Suspended</span> : null}
                  </div>
                  <p className="truncate text-xs text-[#766f65]">{user.email}</p>
                  <p className="mt-1 text-[11px] text-[#91887c]">Joined {joinedLabel(user.createdAt)} · {user.spaceCount} shared {user.spaceCount === 1 ? "space" : "spaces"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  disabled={isSelf || busy}
                  onClick={() => role.mutate({ user, nextRole: user.role === "admin" ? "user" : "admin" })}
                >
                  {user.role === "admin" ? <ShieldOff className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                  {user.role === "admin" ? "Remove admin" : "Make admin"}
                </Button>
                <Button
                  variant={user.status === "active" ? "danger" : "secondary"}
                  className="h-9 px-3 text-xs"
                  disabled={isSelf || busy}
                  onClick={() => toggleStatus(user)}
                >
                  {user.status === "active" ? <UserRoundX className="size-3.5" /> : <UserRoundCheck className="size-3.5" />}
                  {user.status === "active" ? "Suspend" : "Reactivate"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </Modal>
  );
}
