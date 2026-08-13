import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, FileAudio, FileImage, FileText, FileUp, FileVideo, FolderPlus, MessageCircle, MessagesSquare, Phone, RefreshCw, Share2, Trash2, UsersRound, X } from "lucide-react";
import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { Album } from "@zo-moments/types";
import { isSupportedMomentFileName, maxMomentFilesPerBatch, supportedMomentFileAccept } from "@zo-moments/types/upload";
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

type PendingUpload = {
  id: string;
  file: File;
  caption: string;
  status: "ready" | "uploading" | "done" | "error";
  error?: string | undefined;
};

const maxUploadBytes = 100 * 1024 * 1024;

function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadFileIcon({ file }: { file: File }) {
  if (file.type.startsWith("image/")) return <FileImage className="size-5" />;
  if (file.type.startsWith("video/")) return <FileVideo className="size-5" />;
  if (file.type.startsWith("audio/")) return <FileAudio className="size-5" />;
  return <FileText className="size-5" />;
}

export function UploadDialog({ open, onClose, spaceId, albums }: { open: boolean; onClose: () => void; spaceId: string; albums: Album[] }) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<PendingUpload[]>([]);
  const mutation = useMutation({
    mutationFn: async (input: { uploads: PendingUpload[]; albumId?: string; occurredAt?: string }) => {
      let succeeded = 0;
      let failed = 0;
      for (const upload of input.uploads.filter((item) => item.status !== "done")) {
        setFiles((current) => current.map((item) => item.id === upload.id ? { ...item, status: "uploading", error: undefined } : item));
        try {
          const caption = upload.caption.trim();
          await api.uploadObject({ spaceId, file: upload.file, ...(input.albumId ? { albumId: input.albumId } : {}), ...(caption ? { caption } : {}), ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}) });
          succeeded += 1;
          setFiles((current) => current.map((item) => item.id === upload.id ? { ...item, status: "done", error: undefined } : item));
        } catch (cause) {
          failed += 1;
          const message = cause instanceof ZoMomentsApiError ? cause.message : "Upload failed";
          setFiles((current) => current.map((item) => item.id === upload.id ? { ...item, status: "error", error: message } : item));
        }
      }
      return { succeeded, failed };
    },
    onSuccess: async ({ succeeded, failed }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["objects", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["spaces"] }),
      ]);
      if (failed) {
        toast.error(`${failed} ${failed === 1 ? "file" : "files"} could not be uploaded. Review and retry.`);
        return;
      }
      toast.success(`${succeeded} ${succeeded === 1 ? "moment" : "moments"} added to your timeline`);
      setFiles([]);
      onClose();
    },
  });

  useEffect(() => {
    if (!open && !mutation.isPending) setFiles([]);
  }, [open, mutation.isPending]);

  function addFiles(selected: FileList | File[]) {
    const incoming = Array.from(selected);
    const existingKeys = new Set(files.map((item) => `${item.file.name}:${item.file.size}:${item.file.lastModified}`));
    const available = Math.max(0, maxMomentFilesPerBatch - files.length);
    const valid: File[] = [];
    let rejected = 0;
    for (const file of incoming) {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (valid.length >= available || existingKeys.has(key) || !isSupportedMomentFileName(file.name) || file.size <= 0 || file.size > maxUploadBytes) {
        rejected += 1;
        continue;
      }
      existingKeys.add(key);
      valid.push(file);
    }
    if (valid.length) {
      setFiles((current) => [...current, ...valid.map((file) => ({ id: crypto.randomUUID(), file, caption: "", status: "ready" as const }))]);
    }
    if (rejected) toast.error(`${rejected} ${rejected === 1 ? "file was" : "files were"} skipped because of format, size, duplication, or the 25-file limit.`);
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!mutation.isPending) addFiles(event.dataTransfer.files);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pending = files.filter((file) => file.status !== "done");
    if (!pending.length) return;
    const data = new FormData(event.currentTarget);
    const albumId = String(data.get("albumId") ?? "");
    const occurredAt = String(data.get("occurredAt") ?? "");
    mutation.mutate({ uploads: files, ...(albumId ? { albumId } : {}), ...(occurredAt ? { occurredAt } : {}) });
  }

  const remaining = files.filter((file) => file.status !== "done").length;
  const currentUpload = files.findIndex((file) => file.status === "uploading") + 1;
  return (
    <Modal open={open} onClose={onClose} title="Add moments" description="Add one memory or a whole day at once. Everything stays private inside this space." size="xl">
      <form className="grid gap-4 sm:gap-5" onSubmit={submit}>
        <label onDragOver={(event) => event.preventDefault()} onDrop={drop} className="group grid min-h-36 cursor-pointer place-items-center rounded-[24px] border-2 border-dashed border-[#cfbfa9] bg-[#f7f0e6] p-5 text-center transition hover:border-[#718277] hover:bg-[#f2e9dc] sm:min-h-40 sm:p-6">
          <input className="sr-only" type="file" accept={supportedMomentFileAccept} multiple onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} disabled={mutation.isPending || files.length >= maxMomentFilesPerBatch} />
          <span>
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[#26372f] text-[#fffaf2]"><FileUp className="size-5" /></span>
            <strong className="block text-sm text-[#34443a]">Choose files or drag them here</strong>
            <span className="mt-1 block text-xs text-[#81796e]">Up to 25 files · 100 MB each</span>
          </span>
        </label>
        <div className="grid gap-2 rounded-[20px] border border-[#ded3c3] bg-[#fffaf2] p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileImage, label: "Photos", formats: "JPG, PNG, WebP, GIF" },
            { icon: FileVideo, label: "Video", formats: "MP4, MOV, WebM" },
            { icon: FileAudio, label: "Audio", formats: "MP3, M4A, WAV, OGG" },
            { icon: FileText, label: "Documents", formats: "PDF, TXT, CSV, Office" },
          ].map(({ icon: Icon, label, formats }) => <div key={label} className="flex items-start gap-3 rounded-[14px] bg-[#f4ede1] p-3"><Icon className="mt-0.5 size-4 shrink-0 text-[#a9503f]" /><div><strong className="block text-xs text-[#34443a]">{label}</strong><span className="mt-0.5 block text-[10px] leading-4 text-[#81796e]">{formats}</span></div></div>)}
          <p className="text-[10px] leading-4 text-[#81796e] sm:col-span-2 lg:col-span-4">Photos, compatible video and audio, and PDFs can preview in Zo Moments. Other documents keep their original format for download.</p>
        </div>
        {files.length ? <section className="rounded-[22px] border border-[#ded3c3] bg-[#f7f0e6] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#a9503f]">Upload queue</p><p className="mt-1 text-xs text-[#756d62]">Add a different caption to each moment.</p></div><span className="rounded-full bg-[#e7ddcf] px-3 py-1.5 text-xs font-bold text-[#526158]">{files.length} / {maxMomentFilesPerBatch}</span></div>
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
            {files.map((item) => <div key={item.id} className="relative grid min-w-0 gap-3 rounded-[16px] border border-[#e1d7c8] bg-[#fffdf8] p-3 sm:grid-cols-[auto_minmax(0,.8fr)_minmax(12rem,1.2fr)_auto] sm:items-center">
              <span className="grid size-10 place-items-center rounded-[12px] bg-[#e9dfd0] text-[#526158]">{item.status === "done" ? <Check className="size-5 text-[#52705e]" /> : <UploadFileIcon file={item.file} />}</span>
              <div className="min-w-0 pr-8 sm:pr-0"><strong className="block truncate text-xs text-[#34443a]">{item.file.name}</strong><span className="mt-0.5 block text-[10px] text-[#81796e]">{fileSize(item.file.size)}{item.status === "uploading" ? " · Uploading…" : item.status === "done" ? " · Added" : item.status === "error" ? ` · ${item.error}` : ""}</span></div>
              <Input aria-label={`Caption for ${item.file.name}`} className="h-10 text-xs" value={item.caption} onChange={(event) => setFiles((current) => current.map((file) => file.id === item.id ? { ...file, caption: event.target.value } : file))} placeholder="Caption for this moment" maxLength={500} disabled={mutation.isPending || item.status === "done"} />
              <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))} disabled={mutation.isPending} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full text-[#7d756a] transition hover:bg-[#eee5d8] hover:text-[#9f3f31] disabled:opacity-40 sm:static"><X className="size-4" /></button>
            </div>)}
          </div>
        </section> : null}
        <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-5">
          <Field label="Album" hint="Applied to every selected file.">
            <select name="albumId" disabled={mutation.isPending} className="h-12 min-w-0 w-full rounded-2xl border border-[#d8cdbc] bg-[#fffdf8] px-4 text-sm outline-none focus:border-[#728578] disabled:bg-[#f1eadf]">
              <option value="">No album</option>
              {albums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}
            </select>
          </Field>
          <Field label="When it happened" hint="Optional; applied to every selected file."><Input className="block min-w-0 max-w-full [min-inline-size:0]" name="occurredAt" type="datetime-local" disabled={mutation.isPending} /></Field>
        </div>
        <Button disabled={!remaining || mutation.isPending}>{mutation.isPending ? <><Spinner />Uploading {currentUpload || 1} of {files.length}…</> : `${files.some((file) => file.status === "done") ? "Retry" : "Upload"} ${remaining} ${remaining === 1 ? "moment" : "moments"}`}</Button>
      </form>
    </Modal>
  );
}
