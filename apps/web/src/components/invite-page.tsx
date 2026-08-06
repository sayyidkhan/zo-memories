import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Link2Off, UsersRound } from "lucide-react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { User } from "@zo-moments/types";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { AuthPage } from "./auth-page";
import { Button, Spinner } from "./ui";
import { BrandMark } from "./brand-mark";

export function InvitePage({ token, user, onDone }: { token: string; user: User | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const setSelectedSpaceId = useAppStore((state) => state.setSelectedSpaceId);
  const preview = useQuery({
    queryKey: ["invitation-preview", token],
    queryFn: () => api.getShareInvitation(token),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () => api.acceptShareInvitation(token),
    onSuccess: async ({ space }) => {
      setSelectedSpaceId(space.id);
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      toast.success(`You joined ${space.name}`);
      onDone();
    },
  });

  if (preview.isPending) return <main className="grid min-h-screen place-items-center bg-[#f4ede1] text-[#526359]"><Spinner /></main>;

  if (preview.isError || !preview.data) {
    const message = preview.error instanceof ZoMomentsApiError ? preview.error.message : "This invitation could not be opened";
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4ede1] px-5 text-center text-[#26372f]">
        <section className="max-w-md rounded-[34px] border border-[#d8cdbc] bg-[#fffaf2] p-8 shadow-[0_24px_70px_rgba(51,42,31,.1)] sm:p-11">
          <span className="mx-auto grid size-16 place-items-center rounded-[24px] bg-[#eadbd0] text-[#985142]"><Link2Off className="size-7" /></span>
          <h1 className="mt-6 font-display text-4xl">This link has closed.</h1>
          <p className="mt-3 text-sm leading-6 text-[#746d63]">{message}. Ask the space owner for a new invitation.</p>
          <Button className="mt-7" variant="secondary" onClick={onDone}>Go to Zo Moments</Button>
        </section>
      </main>
    );
  }

  const invitation = preview.data.invitation;
  if (!user) return <AuthPage invitation={invitation} />;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4ede1] px-5 py-10 text-[#26372f]">
      <div className="absolute left-[-8rem] top-[-10rem] size-96 rounded-full bg-[#dcbba1]/30 blur-3xl" />
      <section className="relative w-full max-w-lg rounded-[38px] border border-[#d8cdbc] bg-[#fffaf2] p-7 text-center shadow-[0_28px_80px_rgba(51,42,31,.12)] sm:p-11">
        <BrandMark className="mx-auto size-16" />
        <p className="mt-7 text-[11px] font-bold uppercase tracking-[.2em] text-[#9a5747]">You’re invited</p>
        <h1 className="mt-3 font-display text-5xl leading-none">{invitation.spaceName}</h1>
        <p className="mx-auto mt-5 max-w-sm leading-7 text-[#6f6a61]"><strong className="text-[#34443a]">{invitation.inviterName}</strong> invited you to share and revisit moments together.</p>
        <div className="mt-7 flex items-center justify-center gap-2 rounded-[20px] bg-[#f2e9dc] px-4 py-3 text-sm text-[#5d675f]"><UsersRound className="size-4" />Joining as {user.name}</div>
        {accept.error ? <p className="mt-4 rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{accept.error instanceof ZoMomentsApiError ? accept.error.message : "Could not join this space"}</p> : null}
        <Button className="mt-6 w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>{accept.isPending ? <Spinner /> : <>Join shared space<ArrowRight className="size-4" /></>}</Button>
        <button className="mt-4 text-sm font-semibold text-[#6f786f] hover:text-[#26372f]" onClick={onDone}>Not now</button>
      </section>
    </main>
  );
}
