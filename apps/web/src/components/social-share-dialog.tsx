import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Film, Image, LockKeyhole, RefreshCw, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { MomentObject, Story, StoryStyle } from "@zo-moments/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateSocialExport, type SocialExportFormat } from "@/lib/social-export";
import { Button, Spinner } from "./ui";

const styleNames: Record<StoryStyle, string> = {
  classic: "Classic",
  flipbook: "Flipbook",
  comic: "Comic",
  scrapbook: "Scrapbook",
  cinematic: "Cinematic",
};

interface ExportAsset {
  blob: Blob;
  format: SocialExportFormat;
  name: string;
  url: string;
}

function safeName(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54);
  return slug || "zo-moments-story";
}

function filename(story: Story, format: SocialExportFormat) {
  return `${safeName(story.title)}-zo-moments.${format === "image" ? "png" : "mp4"}`;
}

export function SocialShareDialog({ story, objects, open, onClose }: { story: Story; objects: MomentObject[]; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<SocialExportFormat>("image");
  const [includeLocation, setIncludeLocation] = useState(Boolean(story.location));
  const [includeDate, setIncludeDate] = useState(true);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "rendering" | "saving" | "loading">("idle");
  const [asset, setAsset] = useState<ExportAsset | null>(null);
  const [error, setError] = useState("");
  const moments = useMemo(() => {
    const byId = new Map(objects.map((object) => [object.id, object]));
    return story.momentIds.map((id) => byId.get(id)).filter((object): object is MomentObject => Boolean(object));
  }, [objects, story.momentIds]);
  const status = useQuery({
    queryKey: ["social-exports", story.spaceId, story.id],
    queryFn: () => api.getSocialExports(story.spaceId, story.id),
    enabled: open,
    staleTime: 10_000,
    retry: 1,
  });
  const isBusy = phase !== "idle";
  const selectedExists = Boolean(status.data?.[format]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !isBusy) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isBusy, onClose, open]);

  useEffect(() => () => { if (asset) URL.revokeObjectURL(asset.url); }, [asset]);

  useEffect(() => {
    setIncludeLocation(Boolean(story.location));
    setIncludeDate(true);
    setError("");
  }, [story.id, story.location]);

  function replaceAsset(next: ExportAsset | null) {
    setAsset((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return next;
    });
  }

  function chooseFormat(next: SocialExportFormat) {
    if (isBusy || next === format) return;
    setFormat(next);
    replaceAsset(null);
    setError("");
    setProgress(0);
  }

  async function fetchSaved(selectedFormat: SocialExportFormat) {
    setError("");
    setPhase("loading");
    setProgress(0.35);
    try {
      const response = await fetch(api.socialExportUrl(story.spaceId, story.id, selectedFormat), { credentials: "include" });
      if (!response.ok) throw new Error("The saved export could not be opened");
      const blob = await response.blob();
      replaceAsset({ blob, format: selectedFormat, name: filename(story, selectedFormat), url: URL.createObjectURL(blob) });
      setProgress(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The saved export could not be opened");
    } finally {
      setPhase("idle");
    }
  }

  async function generate() {
    setError("");
    replaceAsset(null);
    setProgress(0);
    setPhase("rendering");
    try {
      const rendered = await generateSocialExport({
        story,
        moments,
        format,
        includeLocation,
        includeDate,
        onProgress: setProgress,
      });
      setPhase("saving");
      setProgress(0.92);
      const sourceExtension = rendered.type.includes("mp4") ? "mp4" : format === "video" ? "webm" : "png";
      const upload = new File([rendered], `story.${sourceExtension}`, { type: rendered.type });
      await api.uploadSocialExport(story.spaceId, story.id, format, upload);
      const response = await fetch(api.socialExportUrl(story.spaceId, story.id, format), { credentials: "include" });
      if (!response.ok) throw new Error("The export was saved but could not be previewed");
      const stored = await response.blob();
      replaceAsset({ blob: stored, format, name: filename(story, format), url: URL.createObjectURL(stored) });
      setProgress(1);
      await queryClient.invalidateQueries({ queryKey: ["social-exports", story.spaceId, story.id] });
      toast.success(`${format === "image" ? "Image" : "Video"} ready to share`);
    } catch (cause) {
      const message = cause instanceof ZoMomentsApiError || cause instanceof Error ? cause.message : "The social export could not be created";
      setError(message);
      setProgress(0);
    } finally {
      setPhase("idle");
    }
  }

  async function shareToApps() {
    if (!asset) return;
    const file = new File([asset.blob], asset.name, { type: asset.blob.type });
    if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
      toast.error("This browser cannot send files directly. Use Download instead.");
      return;
    }
    try {
      await navigator.share({ files: [file], title: story.title, text: `${story.title} · shared from Zo Moments` });
      toast.success("Shared from Zo Moments");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      toast.error("The share sheet could not be opened. Use Download instead.");
    }
  }

  function download() {
    if (!asset) return;
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (!open) return null;
  const styleLabel = story.styleSource === "auto" ? `Auto · ${styleNames[story.style]}` : styleNames[story.style];
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-[#102019]/70 backdrop-blur-md sm:place-items-center" role="presentation" onMouseDown={() => { if (!isBusy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="social-share-title" className="max-h-[94dvh] w-full overflow-y-auto rounded-t-[32px] bg-[#fff8ec] shadow-[0_40px_120px_rgba(8,18,13,.45)] sm:max-w-[58rem] sm:rounded-[36px]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ded2c1] bg-[#fff8ec]/95 px-5 py-5 backdrop-blur-lg sm:px-8 sm:py-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#a9503f]"><Share2 className="size-4" />Share this story <span className="rounded-full bg-[#e8ded0] px-2.5 py-1 text-[#526158]">{styleLabel}</span></div>
            <h2 id="social-share-title" className="font-display text-3xl leading-none text-[#26372f] sm:text-4xl">Make it ready for the world.</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eee5d8] text-[#526158] transition hover:bg-[#e3d8c8] disabled:opacity-40" aria-label="Close sharing"><X className="size-5" /></button>
        </header>

        <div className="grid gap-7 p-5 sm:p-8 lg:grid-cols-[1.03fr_.97fr]">
          <div className="grid content-start gap-6">
            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c594d]">1 · Choose the output</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => chooseFormat("image")} className={cn("relative rounded-[22px] border-2 p-4 text-left transition", format === "image" ? "border-[#a9503f] bg-[#fffdf8] shadow-[0_14px_35px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f1e9dc] hover:border-[#b9aa96]")}>
                  {status.data?.image ? <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[#3e6651] text-white"><Check className="size-3.5" /></span> : null}
                  <span className={cn("grid size-11 place-items-center rounded-[15px]", format === "image" ? "bg-[#a9503f] text-white" : "bg-[#ded3c3] text-[#526158]")}><Image className="size-5" /></span>
                  <strong className="mt-4 block text-sm text-[#26372f]">Portrait image</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#756d63]">4:5 PNG · Posts and feeds</span>
                </button>
                <button type="button" onClick={() => chooseFormat("video")} className={cn("relative rounded-[22px] border-2 p-4 text-left transition", format === "video" ? "border-[#a9503f] bg-[#fffdf8] shadow-[0_14px_35px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f1e9dc] hover:border-[#b9aa96]")}>
                  {status.data?.video ? <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[#3e6651] text-white"><Check className="size-3.5" /></span> : null}
                  <span className={cn("grid size-11 place-items-center rounded-[15px]", format === "video" ? "bg-[#a9503f] text-white" : "bg-[#ded3c3] text-[#526158]")}><Film className="size-5" /></span>
                  <strong className="mt-4 block text-sm text-[#26372f]">Story video</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#756d63]">9:16 MP4 · Stories and Reels</span>
                </button>
              </div>
            </section>

            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c594d]">2 · Choose what appears</p>
              <div className="overflow-hidden rounded-[20px] border border-[#ded3c3] bg-[#fffdf8]">
                <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-[#e6ddcf] px-4 py-3.5 text-sm font-semibold text-[#34443a]">
                  Show story date
                  <input type="checkbox" checked={includeDate} disabled={isBusy} onChange={(event) => { setIncludeDate(event.target.checked); replaceAsset(null); }} className="size-5 accent-[#a9503f]" />
                </label>
                <label className={cn("flex items-center justify-between gap-4 px-4 py-3.5 text-sm font-semibold text-[#34443a]", story.location ? "cursor-pointer" : "opacity-45")}>
                  Show place
                  <input type="checkbox" checked={includeLocation} disabled={isBusy || !story.location} onChange={(event) => { setIncludeLocation(event.target.checked); replaceAsset(null); }} className="size-5 accent-[#a9503f]" />
                </label>
              </div>
            </section>

            <div className="flex gap-3 rounded-[20px] bg-[#e8efe8] p-4 text-xs leading-5 text-[#496052]"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><p><strong>Private until you post.</strong> The reusable export stays inside this shared space. Zo Moments never publishes without opening your device’s confirmation screen.</p></div>

            {error ? <p className="rounded-[18px] bg-[#f6dfd8] px-4 py-3 text-sm text-[#8a372b]">{error}</p> : null}

            {isBusy ? <div className="rounded-[20px] bg-[#26372f] p-4 text-[#fff8ec]"><div className="flex items-center justify-between gap-3 text-sm font-semibold"><span className="flex items-center gap-2"><Spinner />{phase === "rendering" ? `Rendering ${format}…` : phase === "saving" ? "Saving privately and preparing MP4…" : "Opening saved export…"}</span><span>{Math.round(progress * 100)}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#efc46f] transition-[width] duration-300" style={{ width: `${Math.max(5, progress * 100)}%` }} /></div></div> : null}

            {!asset && !isBusy ? <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" onClick={generate}>{format === "image" ? <Image className="size-4" /> : <Film className="size-4" />}Generate {format}</Button>
              {selectedExists ? <Button variant="secondary" className="flex-1" onClick={() => fetchSaved(format)}><RefreshCw className="size-4" />Use saved export</Button> : null}
            </div> : null}

            {asset && !isBusy ? <div className="grid gap-3 sm:grid-cols-2">
              <Button className="sm:col-span-2 h-12" onClick={shareToApps}><Smartphone className="size-4" />Share to apps</Button>
              <Button variant="secondary" onClick={download}><Download className="size-4" />Download</Button>
              <Button variant="ghost" onClick={generate}><RefreshCw className="size-4" />Regenerate</Button>
            </div> : null}
          </div>

          <aside className="grid min-h-[25rem] place-items-center rounded-[28px] bg-[#1d3027] p-5 sm:min-h-[34rem]">
            {asset ? asset.format === "image"
              ? <img src={asset.url} alt={`Social preview of ${story.title}`} className="max-h-[34rem] w-auto max-w-full rounded-[18px] shadow-[0_22px_60px_rgba(0,0,0,.35)]" />
              : <video src={asset.url} controls autoPlay loop muted playsInline className="max-h-[34rem] w-auto max-w-full rounded-[18px] shadow-[0_22px_60px_rgba(0,0,0,.35)]" />
              : <div className={cn("relative grid overflow-hidden border border-white/15 bg-[#304a3e] text-center shadow-[0_22px_60px_rgba(0,0,0,.28)]", format === "image" ? "aspect-[4/5] w-[72%] max-w-[18rem] rounded-[18px]" : "aspect-[9/16] h-[28rem] max-h-[70dvh] rounded-[18px]")}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_22%,rgba(239,196,111,.28),transparent_28%),linear-gradient(160deg,transparent,rgba(9,25,18,.8))]" />
                <div className="relative flex flex-col items-center justify-center p-7 text-[#fff8ec]"><span className="grid size-14 place-items-center rounded-full bg-[#fff8ec]/10">{format === "image" ? <Image className="size-6" /> : <Film className="size-6" />}</span><strong className="mt-5 font-display text-3xl leading-none">{story.title}</strong><span className="mt-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#efc46f]">{styleLabel} preview</span><p className="mt-5 max-w-52 text-xs leading-5 text-white/65">Generate to see your real moments composed in this format.</p></div>
              </div>}
          </aside>
        </div>
      </section>
    </div>
  );
}
