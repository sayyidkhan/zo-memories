import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Eye, Film, Image, LockKeyhole, RefreshCw, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, ZoMomentsApiError, type SocialExportPreset } from "@zo-moments/sdk";
import type { MomentObject, Story, StoryStyle } from "@zo-moments/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateSocialExport, type SocialExportFormat, type SocialExportProfile } from "@/lib/social-export";
import { Button, Spinner } from "./ui";

const styleNames: Record<StoryStyle, string> = {
  classic: "Classic",
  flipbook: "Flipbook",
  comic: "Comic",
  scrapbook: "Scrapbook",
  cinematic: "Cinematic",
};

interface SocialTarget {
  id: string;
  platform: string;
  placement: string;
  format: SocialExportFormat;
  preset: SocialExportPreset;
  width: number;
  height: number;
  profile: SocialExportProfile;
}

const socialTargets: SocialTarget[] = [
  { id: "instagram-feed", platform: "Instagram", placement: "4:5 feed post", format: "image", preset: "instagram-feed", width: 1080, height: 1350, profile: { id: "instagram-feed", safeTop: .05, safeRight: .05, safeBottom: .06, safeLeft: .05, durationMs: 0, maxPhotos: 5, videoBitrate: 0, cropScale: 1.04 } },
  { id: "facebook-feed", platform: "Facebook", placement: "4:5 feed post", format: "image", preset: "facebook-feed", width: 1200, height: 1500, profile: { id: "facebook-feed", safeTop: .04, safeRight: .04, safeBottom: .09, safeLeft: .04, durationMs: 0, maxPhotos: 6, videoBitrate: 0, cropScale: 1.03 } },
  { id: "linkedin-feed", platform: "LinkedIn", placement: "Square post", format: "image", preset: "linkedin-feed", width: 1200, height: 1200, profile: { id: "linkedin-feed", safeTop: .06, safeRight: .07, safeBottom: .1, safeLeft: .07, durationMs: 0, maxPhotos: 4, videoBitrate: 0, cropScale: 1.02 } },
  { id: "x-post", platform: "X", placement: "Square post", format: "image", preset: "x-post", width: 1200, height: 1200, profile: { id: "x-post", safeTop: .05, safeRight: .06, safeBottom: .12, safeLeft: .06, durationMs: 0, maxPhotos: 4, videoBitrate: 0, cropScale: 1.05 } },
  { id: "threads-post", platform: "Threads", placement: "4:5 feed post", format: "image", preset: "threads-post", width: 1080, height: 1350, profile: { id: "threads-post", safeTop: .07, safeRight: .06, safeBottom: .1, safeLeft: .06, durationMs: 0, maxPhotos: 5, videoBitrate: 0, cropScale: 1.03 } },
  { id: "pinterest-pin", platform: "Pinterest", placement: "2:3 standard Pin", format: "image", preset: "pinterest-pin", width: 1000, height: 1500, profile: { id: "pinterest-pin", safeTop: .08, safeRight: .08, safeBottom: .12, safeLeft: .07, durationMs: 0, maxPhotos: 6, videoBitrate: 0, cropScale: 1.02 } },
  { id: "instagram-reels", platform: "Instagram", placement: "9:16 Story or Reel · 9s", format: "video", preset: "instagram-reels", width: 1080, height: 1920, profile: { id: "instagram-reels", safeTop: .14, safeRight: .12, safeBottom: .19, safeLeft: .07, durationMs: 9_000, maxPhotos: 8, videoBitrate: 6_000_000, cropScale: 1.04 } },
  { id: "facebook-reels", platform: "Facebook", placement: "9:16 Story or Reel · 12s", format: "video", preset: "facebook-reels", width: 1080, height: 1920, profile: { id: "facebook-reels", safeTop: .1, safeRight: .09, safeBottom: .15, safeLeft: .07, durationMs: 12_000, maxPhotos: 9, videoBitrate: 6_000_000, cropScale: 1.03 } },
  { id: "tiktok", platform: "TikTok", placement: "9:16 UI-safe video · 15s", format: "video", preset: "tiktok", width: 1080, height: 1920, profile: { id: "tiktok", safeTop: .13, safeRight: .2, safeBottom: .25, safeLeft: .07, durationMs: 15_000, maxPhotos: 10, videoBitrate: 6_000_000, cropScale: 1.07 } },
  { id: "youtube-shorts", platform: "YouTube", placement: "9:16 Short · 12s", format: "video", preset: "youtube-shorts", width: 1080, height: 1920, profile: { id: "youtube-shorts", safeTop: .09, safeRight: .12, safeBottom: .2, safeLeft: .07, durationMs: 12_000, maxPhotos: 10, videoBitrate: 8_000_000, cropScale: 1.03 } },
  { id: "whatsapp-status", platform: "WhatsApp", placement: "9:16 Status · 10s", format: "video", preset: "whatsapp-status", width: 1080, height: 1920, profile: { id: "whatsapp-status", safeTop: .09, safeRight: .06, safeBottom: .13, safeLeft: .06, durationMs: 10_000, maxPhotos: 7, videoBitrate: 5_000_000, cropScale: 1.02 } },
  { id: "x-vertical", platform: "X", placement: "9:16 vertical video · 12s", format: "video", preset: "x-vertical", width: 1080, height: 1920, profile: { id: "x-vertical", safeTop: .07, safeRight: .08, safeBottom: .14, safeLeft: .06, durationMs: 12_000, maxPhotos: 8, videoBitrate: 7_000_000, cropScale: 1.03 } },
  { id: "snapchat", platform: "Snapchat", placement: "9:16 Story or Spotlight · 10s", format: "video", preset: "snapchat", width: 1080, height: 1920, profile: { id: "snapchat", safeTop: .15, safeRight: .1, safeBottom: .17, safeLeft: .07, durationMs: 10_000, maxPhotos: 8, videoBitrate: 6_000_000, cropScale: 1.05 } },
];

interface ExportAsset {
  blob: Blob;
  format: SocialExportFormat;
  preset: SocialExportPreset;
  url: string;
}

function safeName(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54);
  return slug || "zo-moments-story";
}

function filename(story: Story, target: SocialTarget) {
  return `${safeName(story.title)}-${target.id}.${target.format === "image" ? "png" : "mp4"}`;
}

export function SocialShareDialog({ story, objects, open, onClose }: { story: Story; objects: MomentObject[]; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<SocialExportFormat>("image");
  const [targetId, setTargetId] = useState("instagram-feed");
  const [includeLocation, setIncludeLocation] = useState(Boolean(story.location));
  const [includeDate, setIncludeDate] = useState(true);
  const [appearanceChanged, setAppearanceChanged] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "rendering" | "saving" | "loading">("idle");
  const [asset, setAsset] = useState<ExportAsset | null>(null);
  const [error, setError] = useState("");
  const target = socialTargets.find((item) => item.id === targetId) ?? socialTargets[0]!;
  const availableTargets = socialTargets.filter((item) => item.format === format);
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
  const imageHasExports = socialTargets.some((item) => item.format === "image" && status.data?.[item.preset]);
  const videoHasExports = socialTargets.some((item) => item.format === "video" && status.data?.[item.preset]);

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
    setAppearanceChanged(false);
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
    const defaultTarget = socialTargets.find((item) => item.format === next)!;
    setFormat(next);
    setTargetId(defaultTarget.id);
    replaceAsset(null);
    setError("");
    setProgress(0);
  }

  function downloadForTarget(next: SocialTarget, source: ExportAsset) {
    const link = document.createElement("a");
    link.href = source.url;
    link.download = filename(story, next);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function fetchSaved(next: SocialTarget) {
    setError("");
    setPhase("loading");
    setProgress(0.35);
    try {
      const response = await fetch(api.socialExportUrl(story.spaceId, story.id, next.preset), { credentials: "include" });
      if (!response.ok) throw new Error("The saved export could not be opened");
      const blob = await response.blob();
      const nextAsset = { blob, format: next.format, preset: next.preset, url: URL.createObjectURL(blob) } satisfies ExportAsset;
      replaceAsset(nextAsset);
      setProgress(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The saved export could not be opened");
    } finally {
      setPhase("idle");
    }
  }

  async function generate(next: SocialTarget) {
    setError("");
    replaceAsset(null);
    setProgress(0);
    setPhase("rendering");
    try {
      const rendered = await generateSocialExport({
        story,
        moments,
        format: next.format,
        includeLocation,
        includeDate,
        outputWidth: next.width,
        outputHeight: next.height,
        profile: next.profile,
        onProgress: setProgress,
      });
      setPhase("saving");
      setProgress(0.92);
      const sourceExtension = rendered.type.includes("mp4") ? "mp4" : next.format === "video" ? "webm" : "png";
      const upload = new File([rendered], `story.${sourceExtension}`, { type: rendered.type });
      await api.uploadSocialExport(story.spaceId, story.id, next.preset, upload);
      const response = await fetch(api.socialExportUrl(story.spaceId, story.id, next.preset), { credentials: "include" });
      if (!response.ok) throw new Error("The export was saved but could not be previewed");
      const stored = await response.blob();
      const nextAsset = { blob: stored, format: next.format, preset: next.preset, url: URL.createObjectURL(stored) } satisfies ExportAsset;
      replaceAsset(nextAsset);
      setProgress(1);
      await queryClient.invalidateQueries({ queryKey: ["social-exports", story.spaceId, story.id] });
      toast.success(`${next.platform} preview ready`);
    } catch (cause) {
      const message = cause instanceof ZoMomentsApiError || cause instanceof Error ? cause.message : "The social export could not be created";
      setError(message);
      setProgress(0);
    } finally {
      setPhase("idle");
    }
  }

  async function exportTo(next: SocialTarget) {
    if (isBusy) return;
    setTargetId(next.id);
    setError("");
    setProgress(0);
    if (asset?.preset === next.preset) {
      downloadForTarget(next, asset);
      return;
    }
    replaceAsset(null);
    if (!appearanceChanged && status.data?.[next.preset]) await fetchSaved(next);
    else await generate(next);
  }

  async function shareToApps() {
    if (!asset) return;
    const file = new File([asset.blob], filename(story, target), { type: asset.blob.type });
    if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
      toast.error("This browser cannot send files directly. Select the destination again to download.");
      return;
    }
    try {
      await navigator.share({ files: [file], title: story.title, text: `${story.title} · shared from Zo Moments` });
      toast.success("Shared from Zo Moments");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      toast.error("The share sheet could not be opened. Select the destination again to download.");
    }
  }

  if (!open) return null;
  const styleLabel = story.styleSource === "auto" ? `Auto · ${styleNames[story.style]}` : styleNames[story.style];
  const aspectRatio = `${target.width} / ${target.height}`;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-[#102019]/70 backdrop-blur-md sm:place-items-center" role="presentation" onMouseDown={() => { if (!isBusy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="social-share-title" className="max-h-[94dvh] w-full overflow-y-auto rounded-t-[32px] bg-[#fff8ec] shadow-[0_40px_120px_rgba(8,18,13,.45)] sm:max-w-[64rem] sm:rounded-[36px]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#ded2c1] bg-[#fff8ec]/95 px-5 py-5 backdrop-blur-lg sm:px-8 sm:py-6">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#a9503f]"><Share2 className="size-4" />Share this story <span className="rounded-full bg-[#e8ded0] px-2.5 py-1 text-[#526158]">{styleLabel}</span></div>
            <h2 id="social-share-title" className="font-display text-3xl leading-none text-[#26372f] sm:text-4xl">Make it fit the destination.</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isBusy} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eee5d8] text-[#526158] transition hover:bg-[#e3d8c8] disabled:opacity-40" aria-label="Close sharing"><X className="size-5" /></button>
        </header>

        <div className="grid gap-7 p-5 sm:p-8 lg:grid-cols-[1.08fr_.92fr]">
          <div className="grid content-start gap-6">
            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c594d]">1 · Choose the output</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => chooseFormat("image")} className={cn("relative rounded-[22px] border-2 p-4 text-left transition", format === "image" ? "border-[#a9503f] bg-[#fffdf8] shadow-[0_14px_35px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f1e9dc] hover:border-[#b9aa96]")}>
                  {imageHasExports ? <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[#3e6651] text-white"><Check className="size-3.5" /></span> : null}
                  <span className={cn("grid size-11 place-items-center rounded-[15px]", format === "image" ? "bg-[#a9503f] text-white" : "bg-[#ded3c3] text-[#526158]")}><Image className="size-5" /></span>
                  <strong className="mt-4 block text-sm text-[#26372f]">Social image</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#756d63]">PNG · Adapted per platform</span>
                </button>
                <button type="button" onClick={() => chooseFormat("video")} className={cn("relative rounded-[22px] border-2 p-4 text-left transition", format === "video" ? "border-[#a9503f] bg-[#fffdf8] shadow-[0_14px_35px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f1e9dc] hover:border-[#b9aa96]")}>
                  {videoHasExports ? <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[#3e6651] text-white"><Check className="size-3.5" /></span> : null}
                  <span className={cn("grid size-11 place-items-center rounded-[15px]", format === "video" ? "bg-[#a9503f] text-white" : "bg-[#ded3c3] text-[#526158]")}><Film className="size-5" /></span>
                  <strong className="mt-4 block text-sm text-[#26372f]">Social video</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#756d63]">MP4 · Platform-safe pacing</span>
                </button>
              </div>
            </section>

            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c594d]">2 · Choose what appears</p>
              <div className="overflow-hidden rounded-[20px] border border-[#ded3c3] bg-[#fffdf8]">
                <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-[#e6ddcf] px-4 py-3.5 text-sm font-semibold text-[#34443a]">Show story date<input type="checkbox" checked={includeDate} disabled={isBusy} onChange={(event) => { setIncludeDate(event.target.checked); setAppearanceChanged(true); replaceAsset(null); }} className="size-5 accent-[#a9503f]" /></label>
                <label className={cn("flex items-center justify-between gap-4 px-4 py-3.5 text-sm font-semibold text-[#34443a]", story.location ? "cursor-pointer" : "opacity-45")}>Show place<input type="checkbox" checked={includeLocation} disabled={isBusy || !story.location} onChange={(event) => { setIncludeLocation(event.target.checked); setAppearanceChanged(true); replaceAsset(null); }} className="size-5 accent-[#a9503f]" /></label>
              </div>
            </section>

            <section>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c594d]">3 · Preview and export</p>
              <p className="mb-3 text-xs leading-5 text-[#756d63]">Select a destination to preview its crop, safe area and pacing. Select it again when you are ready to download.</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableTargets.map((item) => <button key={item.id} type="button" disabled={isBusy} onClick={() => void exportTo(item)} aria-label={asset?.preset === item.preset ? `Download for ${item.platform} ${item.placement}` : `Preview for ${item.platform} ${item.placement}`} className={cn("relative rounded-[16px] border px-3 py-3 text-left transition disabled:cursor-wait disabled:opacity-55", item.id === target.id ? "border-[#a9503f] bg-[#fffdf8] shadow-[0_8px_22px_rgba(169,80,63,.1)]" : "border-[#ded3c3] bg-[#f3ebdf] hover:border-[#b9aa96]")}>
                  {asset?.preset === item.preset ? <Download className="absolute right-2.5 top-2.5 size-3.5 text-[#3e6651]" /> : <Eye className="absolute right-2.5 top-2.5 size-3.5 text-[#a9503f]" />}
                  <strong className="block pr-5 text-xs text-[#26372f]">{item.platform}</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#756d63]">{item.placement}</span>
                </button>)}
              </div>
              <p className="mt-3 text-[11px] text-[#827a70]">Selected: {target.width} × {target.height}px · {target.format === "image" ? "PNG" : "H.264 MP4"} · destination-safe composition</p>
            </section>

            <div className="flex gap-3 rounded-[20px] bg-[#e8efe8] p-4 text-xs leading-5 text-[#496052]"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><p><strong>Private until you post.</strong> The reusable master stays inside this shared space. Zo Moments never publishes without opening your device’s confirmation screen.</p></div>
            {error ? <p className="rounded-[18px] bg-[#f6dfd8] px-4 py-3 text-sm text-[#8a372b]">{error}</p> : null}
            {asset && !isBusy ? <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Button className="h-12" onClick={shareToApps}><Smartphone className="size-4" />Share to apps</Button><Button variant="ghost" onClick={() => void generate(target)}><RefreshCw className="size-4" />Regenerate</Button></div> : null}
          </div>

          <aside className="relative grid min-h-[25rem] place-items-center overflow-hidden rounded-[28px] bg-[#1d3027] p-5 sm:min-h-[34rem]">
            {asset ? asset.format === "image"
              ? <img src={asset.url} alt={`${target.platform} preview of ${story.title}`} className="max-h-[34rem] w-auto max-w-full rounded-[18px] shadow-[0_22px_60px_rgba(0,0,0,.35)]" />
              : <video src={asset.url} controls autoPlay loop muted playsInline className="max-h-[34rem] w-auto max-w-full rounded-[18px] shadow-[0_22px_60px_rgba(0,0,0,.35)]" />
              : <div className="relative grid max-h-[32rem] w-[72%] max-w-[19rem] overflow-hidden rounded-[18px] border border-white/15 bg-[#304a3e] text-center shadow-[0_22px_60px_rgba(0,0,0,.28)]" style={{ aspectRatio }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_22%,rgba(239,196,111,.28),transparent_28%),linear-gradient(160deg,transparent,rgba(9,25,18,.8))]" />
                <div className="relative flex flex-col items-center justify-center p-7 text-[#fff8ec]"><span className="grid size-14 place-items-center rounded-full bg-[#fff8ec]/10">{target.format === "image" ? <Image className="size-6" /> : <Film className="size-6" />}</span><strong className="mt-5 font-display text-3xl leading-none">{story.title}</strong><span className="mt-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#efc46f]">{target.platform} · {target.placement}</span><p className="mt-5 max-w-52 text-xs leading-5 text-white/65">{styleLabel} composition at {target.width} × {target.height}px.</p></div>
              </div>}
            {isBusy ? <div className="absolute inset-0 z-10 grid place-items-center bg-[#15271f]/88 p-6 backdrop-blur-sm" role="status" aria-live="polite">
              <div className="w-full max-w-xs rounded-[24px] border border-white/10 bg-[#26372f] p-6 text-center text-[#fff8ec] shadow-[0_24px_70px_rgba(0,0,0,.35)]">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/10"><Spinner /></span>
                <strong className="mt-5 block font-display text-2xl leading-tight">{phase === "rendering" ? `Rendering for ${target.platform}` : phase === "saving" ? "Saving your export" : "Opening saved export"}</strong>
                <p className="mt-2 text-xs leading-5 text-white/60">{phase === "rendering" ? "Composing your moments into the selected story format." : phase === "saving" ? "Keeping the reusable master private in this shared space." : "Preparing the existing master for preview."}</p>
                <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[.14em] text-[#efc46f]"><span>Progress</span><span>{Math.round(progress * 100)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-full origin-left rounded-full bg-[#efc46f]" style={{ transform: `scaleX(${Math.max(0.05, progress)})` }} /></div>
              </div>
            </div> : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
