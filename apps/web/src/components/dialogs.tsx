import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Copy, FileUp, FolderPlus, MessageCircle, MessagesSquare, Phone, RefreshCw, Share2, Trash2, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { Album } from "@zo-moments/types";
import { toast } from "sonner";
import { Button, Field, Input, Modal, Spinner } from "./ui";

function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{error instanceof ZoMomentsApiError ? error.message : "Something went wrong"}</p>;
}

export function CreateSpaceDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { name: string; description?: string }) => api.createSpace(input),
    onSuccess: async ({ space }) => {
      await queryClient.invalidateQueries({ queryKey: ["spaces"] });
      toast.success("Shared space created");
      onCreated(space.id);
      onClose();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "").trim();
    mutation.mutate({ name: String(data.get("name") ?? ""), ...(description ? { description } : {}) });
  }
  return (
    <Modal open={open} onClose={onClose} title="Create a shared space" description="Give a relationship, family, or chapter of life a home of its own.">
      <form className="grid gap-5" onSubmit={submit}>
        <div className="grid size-14 place-items-center rounded-[20px] bg-[#e6d7c1] text-[#526359]"><UsersRound className="size-6" /></div>
        <Field label="Space name"><Input name="name" placeholder="Khan Family" minLength={2} maxLength={80} autoFocus required /></Field>
        <Field label="A short note"><Input name="description" placeholder="The people and moments that feel like home" maxLength={240} /></Field>
        <ErrorMessage error={mutation.error} />
        <Button disabled={mutation.isPending}>{mutation.isPending ? <Spinner /> : "Create space"}</Button>
      </form>
    </Modal>
  );
}

export function InviteDialog({ open, onClose, spaceId }: { open: boolean; onClose: () => void; spaceId: string }) {
  const queryClient = useQueryClient();
  const invitation = useQuery({
    queryKey: ["share-invitation", spaceId],
    queryFn: () => api.createShareInvitation(spaceId),
    enabled: open,
    staleTime: 0,
  });
  const regenerate = useMutation({
    mutationFn: () => api.createShareInvitation(spaceId, { regenerate: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(["share-invitation", spaceId], data);
      toast.success("A new invitation link is ready");
    },
  });
  const revoke = useMutation({
    mutationFn: () => api.revokeShareInvitation(spaceId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["share-invitation", spaceId] });
      toast.success("Invitation link revoked");
      onClose();
    },
  });
  const token = invitation.data?.invitation.token;
  const basePath = document.querySelector<HTMLMetaElement>('meta[name="application-base-path"]')?.content ?? "/";
  const shareUrl = token ? `${window.location.origin}${basePath}?invite=${encodeURIComponent(token)}` : "";
  const message = shareUrl ? `Join my shared space on Zo Moments: ${shareUrl}` : "";

  async function copyLink() {
    if (!shareUrl) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
    } else {
      const input = document.createElement("textarea");
      input.value = shareUrl;
      document.body.append(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    toast.success("Invitation link copied");
  }

  async function nativeShare() {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({ title: "Join me on Zo Moments", text: "Join my shared space on Zo Moments.", url: shareUrl });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share an invitation" description="Send this private link through the app you already use. It works once and expires after 30 days.">
      {invitation.isPending ? <div className="grid min-h-52 place-items-center text-[#607066]"><Spinner /></div> : null}
      {invitation.isError ? <ErrorMessage error={invitation.error} /> : null}
      {shareUrl ? (
        <div className="grid min-w-0 gap-5">
          <div className="min-w-0 overflow-hidden rounded-[22px] border border-[#d8cdbc] bg-[#f7f0e6] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8f5547]">Invitation link</p>
            <p className="mt-2 block max-w-full truncate text-sm text-[#536158]">{shareUrl}</p>
          </div>
          {"share" in navigator ? <Button onClick={() => void nativeShare()}><Share2 className="size-4" />Share invitation</Button> : null}
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="grid min-h-20 min-w-0 place-items-center gap-1 rounded-[20px] border border-[#d8cdbc] bg-[#fffdf8] p-3 text-center text-xs font-semibold text-[#34443a] transition hover:bg-[#f3ebdf]"><MessageCircle className="size-5" />WhatsApp</a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Join my shared space on Zo Moments")}`} target="_blank" rel="noreferrer" className="grid min-h-20 min-w-0 place-items-center gap-1 rounded-[20px] border border-[#d8cdbc] bg-[#fffdf8] p-3 text-center text-xs font-semibold text-[#34443a] transition hover:bg-[#f3ebdf]"><MessagesSquare className="size-5" />Telegram</a>
            <a href={`sms:?body=${encodeURIComponent(message)}`} className="grid min-h-20 min-w-0 place-items-center gap-1 rounded-[20px] border border-[#d8cdbc] bg-[#fffdf8] p-3 text-center text-xs font-semibold text-[#34443a] transition hover:bg-[#f3ebdf]"><Phone className="size-5" />SMS</a>
            <button type="button" onClick={() => void copyLink()} className="grid min-h-20 min-w-0 place-items-center gap-1 rounded-[20px] border border-[#d8cdbc] bg-[#fffdf8] p-3 text-center text-xs font-semibold text-[#34443a] transition hover:bg-[#f3ebdf]"><Copy className="size-5" />Copy link</button>
          </div>
          <p className="text-xs leading-5 text-[#81796f]">The first person who accepts this link becomes a member. You can replace or revoke it at any time.</p>
          <div className="flex flex-col gap-2 border-t border-[#e1d7c9] pt-4 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => regenerate.mutate()} disabled={regenerate.isPending || revoke.isPending}>{regenerate.isPending ? <Spinner /> : <><RefreshCw className="size-4" />New link</>}</Button>
            <Button variant="ghost" className="text-[#9f3f31]" onClick={() => revoke.mutate()} disabled={regenerate.isPending || revoke.isPending}>{revoke.isPending ? <Spinner /> : <><Trash2 className="size-4" />Revoke</>}</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function AlbumDialog({ open, onClose, spaceId }: { open: boolean; onClose: () => void; spaceId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { name: string; description?: string }) => api.createAlbum(spaceId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["space", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["albums", spaceId] }),
      ]);
      toast.success("Album created");
      onClose();
    },
  });
  return (
    <Modal open={open} onClose={onClose} title="Make an album" description="Gather related moments into a chapter you can return to.">
      <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const description = String(data.get("description") ?? "").trim(); mutation.mutate({ name: String(data.get("name") ?? ""), ...(description ? { description } : {}) }); }}>
        <div className="grid size-14 place-items-center rounded-[20px] bg-[#e6d7c1] text-[#526359]"><FolderPlus className="size-6" /></div>
        <Field label="Album name"><Input name="name" placeholder="Tokyo, June 2026" autoFocus required maxLength={80} /></Field>
        <Field label="Description"><Input name="description" placeholder="Late trains, tiny cafes, and a lot of rain" maxLength={240} /></Field>
        <ErrorMessage error={mutation.error} />
        <Button disabled={mutation.isPending}>{mutation.isPending ? <Spinner /> : "Create album"}</Button>
      </form>
    </Modal>
  );
}

export function UploadDialog({ open, onClose, spaceId, albums }: { open: boolean; onClose: () => void; spaceId: string; albums: Album[] }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation({
    mutationFn: (input: { file: File; albumId?: string; caption?: string; occurredAt?: string }) => api.uploadObject({ spaceId, ...input }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["objects", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["spaces"] }),
      ]);
      toast.success("Memory added to your timeline");
      setFile(null);
      onClose();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const data = new FormData(event.currentTarget);
    const albumId = String(data.get("albumId") ?? "");
    const caption = String(data.get("caption") ?? "").trim();
    const occurredAt = String(data.get("occurredAt") ?? "");
    mutation.mutate({ file, ...(albumId ? { albumId } : {}), ...(caption ? { caption } : {}), ...(occurredAt ? { occurredAt } : {}) });
  }
  return (
    <Modal open={open} onClose={onClose} title="Add a memory" description="Photos, video, audio, PDFs, and documents stay private inside this space." size="lg">
      <form className="grid gap-4 sm:gap-5" onSubmit={submit}>
        <label className="group grid min-h-36 cursor-pointer place-items-center rounded-[24px] border-2 border-dashed border-[#cfbfa9] bg-[#f7f0e6] p-5 text-center transition hover:border-[#718277] hover:bg-[#f2e9dc] sm:min-h-40 sm:p-6">
          <input className="sr-only" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
          <span>
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[#26372f] text-[#fffaf2]"><FileUp className="size-5" /></span>
            <strong className="mx-auto block max-w-md truncate text-sm text-[#34443a]">{file ? file.name : "Choose a file"}</strong>
            <span className="mt-1 block text-xs text-[#81796e]">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Up to 100 MB"}</span>
          </span>
        </label>
        <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-5">
          <Field label="Album">
            <select name="albumId" className="h-12 min-w-0 w-full rounded-2xl border border-[#d8cdbc] bg-[#fffdf8] px-4 text-sm outline-none focus:border-[#728578]">
              <option value="">No album</option>
              {albums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}
            </select>
          </Field>
          <Field label="When it happened"><div className="relative min-w-0"><CalendarDays className="pointer-events-none absolute left-4 top-3.5 size-4 text-[#81796f]" /><Input className="min-w-0 pl-11" name="occurredAt" type="datetime-local" /></div></Field>
        </div>
        <Field label="Caption"><Input name="caption" placeholder="The story behind this moment" maxLength={500} /></Field>
        <ErrorMessage error={mutation.error} />
        <Button disabled={!file || mutation.isPending}>{mutation.isPending ? <Spinner /> : "Add to our story"}</Button>
      </form>
    </Modal>
  );
}
