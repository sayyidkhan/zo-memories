import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, Settings2, ShieldCheck } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { api } from "@zo-moments/sdk";
import type { User } from "@zo-moments/types";
import { useAppStore } from "@/lib/store";
import { AuthPage } from "./components/auth-page";
import { AccountDialog } from "./components/account-dialog";
import { AdminDialog } from "./components/admin-dialog";
import { BrandMark } from "./components/brand-mark";
import { CreateSpaceDialog } from "./components/dialogs";
import { InvitePage } from "./components/invite-page";
import { ProfileAvatar } from "./components/profile-avatar";
import { SplashPage } from "./components/splash-page";
import { SpaceView } from "./components/space-view";
import { Button, Spinner } from "./components/ui";

function AppShell({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { selectedSpaceId, setSelectedSpaceId } = useAppStore();
  const spaces = useQuery({ queryKey: ["spaces"], queryFn: () => api.listSpaces() });
  const logout = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      setAccountOpen(false);
      queryClient.clear();
    },
  });

  useEffect(() => {
    if (!selectedSpaceId && spaces.data?.spaces[0]) setSelectedSpaceId(spaces.data.spaces[0].id);
    if (selectedSpaceId && spaces.data && !spaces.data.spaces.some(({ id }) => id === selectedSpaceId)) {
      setSelectedSpaceId(spaces.data.spaces[0]?.id ?? null);
    }
  }, [selectedSpaceId, setSelectedSpaceId, spaces.data]);

  if (spaces.isPending) return <main className="grid min-h-screen place-items-center bg-[#f4ede1] text-[#526359]"><Spinner /></main>;

  return (
    <main className="min-h-screen bg-[#f4ede1] text-[#26372f] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden h-screen border-r border-[#d8cdbd] bg-[#eee5d8] p-5 lg:sticky lg:top-0 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2 py-3 text-sm font-bold uppercase tracking-[.16em]">
          <BrandMark className="size-10" />
          Zo Moments
        </div>
        <div className="mt-9 flex items-center justify-between px-2">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#82796e]">Shared spaces</p>
          <button className="grid size-8 place-items-center rounded-full text-[#536259] hover:bg-[#ddd2c2]" onClick={() => setCreateOpen(true)} aria-label="Create space"><Plus className="size-4" /></button>
        </div>
        <nav className="mt-3 grid gap-1">
          {spaces.data?.spaces.map((space, index) => (
            <button
              key={space.id}
              onClick={() => startTransition(() => setSelectedSpaceId(space.id))}
              className={`flex items-center gap-3 rounded-[18px] px-3 py-3 text-left transition ${selectedSpaceId === space.id ? "bg-[#fffaf2] shadow-[0_8px_28px_rgba(61,48,33,.08)]" : "hover:bg-[#e5dbcc]"}`}
            >
              <span className={`grid size-10 shrink-0 place-items-center rounded-[14px] text-sm font-bold ${["bg-[#d9b9a7]", "bg-[#b9c9b8]", "bg-[#d4c5a6]", "bg-[#b7c5cb]"][index % 4]}`}>{space.name[0]?.toUpperCase()}</span>
              <span className="min-w-0"><strong className="block truncate text-sm">{space.name}</strong><span className="mt-0.5 block text-[11px] text-[#847d73]">{space.objectCount} moments</span></span>
            </button>
          ))}
        </nav>
        <button onClick={() => setCreateOpen(true)} className="mt-4 flex items-center gap-3 rounded-[18px] border border-dashed border-[#c9baa5] px-3 py-3 text-sm font-semibold text-[#647067] hover:bg-[#e5dbcc]"><span className="grid size-9 place-items-center rounded-[13px] bg-[#ded3c2]"><Plus className="size-4" /></span>New shared space</button>
        <div className="mt-auto border-t border-[#d8cdbd] pt-4">
          {user.role === "admin" ? (
            <button onClick={() => setAdminOpen(true)} className="mb-2 flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-semibold text-[#526158] transition hover:bg-[#e3d8c8]" aria-label="Open admin console">
              <span className="grid size-9 place-items-center rounded-[13px] bg-[#d6e2d8] text-[#365044]"><ShieldCheck className="size-4" /></span>
              Admin console
            </button>
          ) : null}
          <button onClick={() => setAccountOpen(true)} className="flex w-full items-center gap-3 rounded-[18px] px-2 py-2 text-left transition hover:bg-[#e3d8c8]" aria-label="Open account settings">
            <ProfileAvatar user={user} className="size-10" textClassName="text-xs" />
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{user.name}</strong><span className="block truncate text-[11px] text-[#847d73]">{user.email}</span></span>
            <Settings2 className="size-4 shrink-0 text-[#69746d]" />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between gap-2 border-b border-[#d8cdbd] bg-[#eee5d8] px-3 sm:px-4 lg:hidden">
          <div className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[.14em]"><BrandMark className="size-9" /><span className="hidden min-[480px]:inline">Zo Moments</span></div>
          <div className="flex items-center gap-2">
            {spaces.data?.spaces.length ? (
              <label className="relative">
                <select aria-label="Current shared space" value={selectedSpaceId ?? ""} onChange={(event) => setSelectedSpaceId(event.target.value)} className="h-10 max-w-28 appearance-none rounded-full bg-[#fffaf2] pl-3 pr-8 text-sm font-semibold outline-none min-[480px]:max-w-40 min-[480px]:pl-4 min-[480px]:pr-9">
                  {spaces.data.spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4" />
              </label>
            ) : null}
            <button onClick={() => setCreateOpen(true)} className="grid size-10 place-items-center rounded-full bg-[#26372f] text-white" aria-label="Create shared space"><Plus className="size-4" /></button>
            {user.role === "admin" ? <button onClick={() => setAdminOpen(true)} className="grid size-10 place-items-center rounded-full bg-[#d8e3da] text-[#365044]" aria-label="Open admin console"><ShieldCheck className="size-4" /></button> : null}
            <button onClick={() => setAccountOpen(true)} aria-label="Open account settings"><ProfileAvatar user={user} className="size-10" textClassName="text-[10px]" /></button>
          </div>
        </header>

        {selectedSpaceId ? <SpaceView spaceId={selectedSpaceId} /> : (
          <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-6 text-center">
            <div className="max-w-xl">
              <BrandMark className="mx-auto size-20" />
              <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#9a5747]">Your first chapter</p>
              <h1 className="mt-3 font-display text-5xl leading-[.98] sm:text-7xl">Make a home for the moments that matter.</h1>
              <p className="mx-auto mt-6 max-w-md leading-7 text-[#746d63]">Create a private space, invite someone you care about, and add your first memory.</p>
              <Button className="mt-8" onClick={() => setCreateOpen(true)}><Plus className="size-4" />Create your first space</Button>
            </div>
          </section>
        )}
      </div>
      <CreateSpaceDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={setSelectedSpaceId} />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} user={user} onSignOut={() => logout.mutate()} signingOut={logout.isPending} />
      {user.role === "admin" ? <AdminDialog open={adminOpen} onClose={() => setAdminOpen(false)} currentUser={user} /> : null}
    </main>
  );
}

export default function App() {
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get("invite"));
  const [authMode, setAuthMode] = useState<"register" | "login" | null>(null);
  const me = useQuery({ queryKey: ["me"], queryFn: () => api.me(), retry: false });
  if (me.isPending) return <main className="grid min-h-screen place-items-center bg-[#f4ede1] text-[#526359]"><Spinner /></main>;
  if (inviteToken) {
    return <InvitePage token={inviteToken} user={me.data?.user ?? null} onDone={() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url);
      setInviteToken(null);
    }} />;
  }
  if (me.isError || !me.data?.user) {
    if (!authMode) return <SplashPage onGetStarted={() => setAuthMode("register")} onSignIn={() => setAuthMode("login")} />;
    return <AuthPage initialMode={authMode} onBack={() => setAuthMode(null)} />;
  }
  return <AppShell user={me.data.user} />;
}
