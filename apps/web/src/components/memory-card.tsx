import { Download, FileText, Headphones, Play, Trash2 } from "lucide-react";
import type { Member, MomentObject } from "@zo-moments/types";
import { api } from "@zo-moments/sdk";
import { formatBytes, shortDate } from "@/lib/utils";
import { Button, Modal } from "./ui";

export function MemoryCard({ object, uploader, index, onOpen }: { object: MomentObject; uploader: Member | undefined; index: number; onOpen: () => void }) {
  const imageUrl = api.objectContentUrl(object.spaceId, object.id);
  const shape = index % 5 === 0 ? "aspect-[4/5]" : index % 7 === 0 ? "aspect-[5/4]" : "aspect-square";
  return (
    <button className="group w-full text-left" onClick={onOpen}>
      <div className={`relative overflow-hidden rounded-[24px] bg-[#ded3c2] ${shape}`}>
        {object.kind === "photo" ? (
          <img src={imageUrl} alt={object.caption || object.name} className="size-full object-cover transition duration-500 group-hover:scale-[1.025]" loading="lazy" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center bg-[radial-gradient(circle_at_35%_25%,#f6e8d4,transparent_36%),linear-gradient(145deg,#cbbda7,#e8ddcb)] p-5 text-center text-[#3e5146]">
            {object.kind === "video" ? <Play className="size-9" fill="currentColor" /> : object.kind === "audio" ? <Headphones className="size-9" /> : <FileText className="size-9" />}
            <span className="mt-3 line-clamp-2 text-xs font-semibold">{object.name}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-between bg-gradient-to-t from-black/65 via-black/15 to-transparent p-4 pt-14 text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          <span className="line-clamp-2 text-sm font-medium">{object.caption || object.name}</span>
          <span className="ml-3 shrink-0 text-[10px] uppercase tracking-wider">{object.kind}</span>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#34443a]">{object.caption || object.name}</p>
          <p className="mt-0.5 text-xs text-[#888075]">{shortDate(object.occurredAt)}{uploader ? ` · Shared by ${uploader.name.split(" ")[0]}` : ""}</p>
        </div>
        <span className="mt-0.5 shrink-0 text-[11px] text-[#91897e]">{formatBytes(object.size)}</span>
      </div>
    </button>
  );
}

export function MemoryPreview({ object, uploader, onClose, onDelete }: { object: MomentObject | null; uploader: Member | undefined; onClose: () => void; onDelete: (object: MomentObject) => void }) {
  if (!object) return null;
  const contentUrl = api.objectContentUrl(object.spaceId, object.id);
  return (
    <Modal open onClose={onClose} title={object.caption || object.name} description={`${shortDate(object.occurredAt)} · ${formatBytes(object.size)}${uploader ? ` · Shared by ${uploader.name}` : ""}`} size="lg">
      <div className="overflow-hidden rounded-[24px] bg-[#171b18]">
        {object.kind === "photo" ? <img src={contentUrl} alt={object.caption || object.name} className="mx-auto max-h-[65vh] w-auto object-contain" /> : null}
        {object.kind === "video" ? <video src={contentUrl} controls className="max-h-[65vh] w-full" /> : null}
        {object.kind === "audio" ? <div className="grid min-h-64 place-items-center bg-[radial-gradient(circle_at_50%_35%,#8da090,transparent_20%),#26372f] p-8"><audio src={contentUrl} controls className="w-full max-w-lg" /></div> : null}
        {object.kind === "document" && object.mimeType === "application/pdf" ? <iframe src={contentUrl} title={object.name} className="h-[65vh] w-full bg-white" /> : null}
        {object.kind === "document" && object.mimeType !== "application/pdf" ? <div className="grid min-h-64 place-items-center p-8 text-[#fffaf2]"><div className="text-center"><FileText className="mx-auto size-12" /><p className="mt-4 text-sm">Preview is not available for this file type.</p></div></div> : null}
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <Button variant="danger" onClick={() => onDelete(object)}><Trash2 className="size-4" />Delete</Button>
        <a href={api.objectContentUrl(object.spaceId, object.id, true)} download><Button variant="secondary"><Download className="size-4" />Download original</Button></a>
      </div>
    </Modal>
  );
}
