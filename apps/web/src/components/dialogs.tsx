import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, FileUp, FolderPlus, MailPlus, UsersRound } from "lucide-react";
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
  const mutation = useMutation({
    mutationFn: (email: string) => api.inviteMember(spaceId, { email }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["space", spaceId] });
      toast.success("Invitation added");
      onClose();
    },
  });
  return (
    <Modal open={open} onClose={onClose} title="Invite someone important" description="Their access activates automatically when they create an account using this email.">
      <form className="grid gap-5" onSubmit={(event) => { event.preventDefault(); mutation.mutate(String(new FormData(event.currentTarget).get("email") ?? "")); }}>
        <div className="grid size-14 place-items-center rounded-[20px] bg-[#e6d7c1] text-[#526359]"><MailPlus className="size-6" /></div>
        <Field label="Email address"><Input name="email" type="email" placeholder="person@example.com" autoFocus required /></Field>
        <ErrorMessage error={mutation.error} />
        <Button disabled={mutation.isPending}>{mutation.isPending ? <Spinner /> : "Send invitation"}</Button>
      </form>
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
    <Modal open={open} onClose={onClose} title="Add a memory" description="Photos, video, audio, PDFs, and documents are kept privately inside this space.">
      <form className="grid gap-5" onSubmit={submit}>
        <label className="group grid min-h-40 cursor-pointer place-items-center rounded-[26px] border-2 border-dashed border-[#cfbfa9] bg-[#f7f0e6] p-6 text-center transition hover:border-[#718277] hover:bg-[#f2e9dc]">
          <input className="sr-only" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
          <span>
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-[#26372f] text-[#fffaf2]"><FileUp className="size-5" /></span>
            <strong className="block text-sm text-[#34443a]">{file ? file.name : "Choose a file"}</strong>
            <span className="mt-1 block text-xs text-[#81796e]">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Up to 100 MB"}</span>
          </span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Album">
            <select name="albumId" className="h-12 rounded-2xl border border-[#d8cdbc] bg-[#fffdf8] px-4 text-sm outline-none focus:border-[#728578]">
              <option value="">No album</option>
              {albums.map((album) => <option key={album.id} value={album.id}>{album.name}</option>)}
            </select>
          </Field>
          <Field label="When it happened"><div className="relative"><CalendarDays className="pointer-events-none absolute left-4 top-3.5 size-4 text-[#81796f]" /><Input className="pl-11" name="occurredAt" type="datetime-local" /></div></Field>
        </div>
        <Field label="Caption"><Input name="caption" placeholder="The story behind this moment" maxLength={500} /></Field>
        <ErrorMessage error={mutation.error} />
        <Button disabled={!file || mutation.isPending}>{mutation.isPending ? <Spinner /> : "Add to our story"}</Button>
      </form>
    </Modal>
  );
}
