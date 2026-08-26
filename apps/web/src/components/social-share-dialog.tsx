import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Clapperboard, Cloud, CloudAlert, Download, Eye, Film, Image, LockKeyhole, Maximize2, Minimize2, Pause, Play, RefreshCw, Share2, Smartphone, Volume2, VolumeX, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, ZoMomentsApiError, type SocialExportPreset } from "@zo-moments/sdk";
import type { DirectorPlan, MomentObject, Story, StoryStyle } from "@zo-moments/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { assessMotionPlan, buildMotionPlan, generateSocialExport, isShareCancellation, type SocialExportFormat, type SocialExportProfile } from "@/lib/social-export";
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
  { id: "instagram-feed", platform: "Instagram", placement: "4:5 carousel · up to 20 slides", format: "image", preset: "instagram-feed", width: 1080, height: 1350, profile: { id: "instagram-feed", safeTop: .05, safeRight: .05, safeBottom: .06, safeLeft: .05, durationMs: 0, maxPhotos: 8, maxSlides: 20, videoBitrate: 0, cropScale: 1.04 } },
  { id: "facebook-feed", platform: "Facebook", placement: "4:5 carousel · up to 10 slides", format: "image", preset: "facebook-feed", width: 1200, height: 1500, profile: { id: "facebook-feed", safeTop: .04, safeRight: .04, safeBottom: .09, safeLeft: .04, durationMs: 0, maxPhotos: 8, maxSlides: 10, videoBitrate: 0, cropScale: 1.03 } },
  { id: "linkedin-feed", platform: "LinkedIn", placement: "Square set · up to 20 images", format: "image", preset: "linkedin-feed", width: 1200, height: 1200, profile: { id: "linkedin-feed", safeTop: .06, safeRight: .07, safeBottom: .1, safeLeft: .07, durationMs: 0, maxPhotos: 18, maxSlides: 20, videoBitrate: 0, cropScale: 1.02 } },
  { id: "x-post", platform: "X", placement: "Square set · 4 images", format: "image", preset: "x-post", width: 1200, height: 1200, profile: { id: "x-post", safeTop: .05, safeRight: .06, safeBottom: .12, safeLeft: .06, durationMs: 0, maxPhotos: 2, maxSlides: 4, videoBitrate: 0, cropScale: 1.05 } },
  { id: "threads-post", platform: "Threads", placement: "4:5 carousel · up to 20 slides", format: "image", preset: "threads-post", width: 1080, height: 1350, profile: { id: "threads-post", safeTop: .07, safeRight: .06, safeBottom: .1, safeLeft: .06, durationMs: 0, maxPhotos: 8, maxSlides: 20, videoBitrate: 0, cropScale: 1.03 } },
  { id: "pinterest-pin", platform: "Pinterest", placement: "2:3 story Pin set · up to 10 slides", format: "image", preset: "pinterest-pin", width: 1000, height: 1500, profile: { id: "pinterest-pin", safeTop: .08, safeRight: .08, safeBottom: .12, safeLeft: .07, durationMs: 0, maxPhotos: 8, maxSlides: 10, videoBitrate: 0, cropScale: 1.02 } },
  { id: "instagram-reels", platform: "Instagram", placement: "9:16 Story or Reel · 9s", format: "video", preset: "instagram-reels", width: 1080, height: 1920, profile: { id: "instagram-reels", safeTop: .14, safeRight: .12, safeBottom: .19, safeLeft: .07, durationMs: 9_000, maxPhotos: 8, videoBitrate: 6_000_000, cropScale: 1.04 } },
  { id: "facebook-reels", platform: "Facebook", placement: "9:16 Story or Reel · 12s", format: "video", preset: "facebook-reels", width: 1080, height: 1920, profile: { id: "facebook-reels", safeTop: .1, safeRight: .09, safeBottom: .15, safeLeft: .07, durationMs: 12_000, maxPhotos: 9, videoBitrate: 6_000_000, cropScale: 1.03 } },
  { id: "tiktok", platform: "TikTok", placement: "9:16 UI-safe video · 15s", format: "video", preset: "tiktok", width: 1080, height: 1920, profile: { id: "tiktok", safeTop: .13, safeRight: .2, safeBottom: .25, safeLeft: .07, durationMs: 15_000, maxPhotos: 10, videoBitrate: 6_000_000, cropScale: 1.07 } },
  { id: "youtube-shorts", platform: "YouTube", placement: "9:16 Short · 12s", format: "video", preset: "youtube-shorts", width: 1080, height: 1920, profile: { id: "youtube-shorts", safeTop: .09, safeRight: .12, safeBottom: .2, safeLeft: .07, durationMs: 12_000, maxPhotos: 10, videoBitrate: 8_000_000, cropScale: 1.03 } },
  { id: "whatsapp-status", platform: "WhatsApp", placement: "9:16 Status · 10s", format: "video", preset: "whatsapp-status", width: 1080, height: 1920, profile: { id: "whatsapp-status", safeTop: .09, safeRight: .06, safeBottom: .13, safeLeft: .06, durationMs: 10_000, maxPhotos: 7, videoBitrate: 5_000_000, cropScale: 1.02 } },
  { id: "x-vertical", platform: "X", placement: "9:16 vertical video · 12s", format: "video", preset: "x-vertical", width: 1080, height: 1920, profile: { id: "x-vertical", safeTop: .07, safeRight: .08, safeBottom: .14, safeLeft: .06, durationMs: 12_000, maxPhotos: 8, videoBitrate: 7_000_000, cropScale: 1.03 } },
  { id: "snapchat", platform: "Snapchat", placement: "9:16 Story or Spotlight · 10s", format: "video", preset: "snapchat", width: 1080, height: 1920, profile: { id: "snapchat", safeTop: .15, safeRight: .1, safeBottom: .17, safeLeft: .07, durationMs: 10_000, maxPhotos: 8, videoBitrate: 6_000_000, cropScale: 1.05 } },
];

const socialExportRendererVersion: Record<SocialExportFormat, string> = {
  image: "carousel-v4-editorial-cut",
  video: "motion-v11-editorial-cut",
};

interface ExportAsset {
  blobs: Blob[];
  format: SocialExportFormat;
  preset: SocialExportPreset;
  urls: string[];
}

function safeName(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54);
  return slug || "zo-moments-story";
}

function filename(story: Story, target: SocialTarget, index = 0, total = 1) {
  const slide = total > 1 ? `-${String(index + 1).padStart(2, "0")}` : "";
  return `${safeName(story.title)}-${target.id}${slide}.${target.format === "image" ? "jpg" : "mp4"}`;
}

function initialShareCaption(story: Story) {
  const opening = (story.canvas?.opening ?? story.opening).trim().slice(0, 240);
  const location = (story.canvas?.location ?? story.location ?? "").trim();
  return [story.canvas?.title ?? story.title, opening, location ? `📍 ${location}` : "", "#ZoMoments"].filter(Boolean).join("\n\n");
}

function rendererVersionKey(story: Story, preset: SocialExportPreset) {
  return `zo-moments:${story.id}:${preset}:renderer`;
}

function videoTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function SocialShareDialog({ story, objects, open, onClose }: { story: Story; objects: MomentObject[]; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<SocialExportFormat>("image");
  const [targetId, setTargetId] = useState("instagram-feed");
  const [includeLocation, setIncludeLocation] = useState(Boolean(story.location));
  const [includeDate, setIncludeDate] = useState(true);
  const [heroMomentSelection, setHeroMomentSelection] = useState("");
  const [savedDirectorPlan, setSavedDirectorPlan] = useState<DirectorPlan | null>(null);
  const [shareCaption, setShareCaption] = useState(() => initialShareCaption(story));
  const [appearanceChanged, setAppearanceChanged] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "rendering" | "loading">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [saveError, setSaveError] = useState("");
  const [asset, setAsset] = useState<ExportAsset | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [error, setError] = useState("");
  const previewRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveControllerRef = useRef<AbortController | null>(null);
  const saveAttemptRef = useRef(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const target = socialTargets.find((item) => item.id === targetId) ?? socialTargets[0]!;
  const availableTargets = socialTargets.filter((item) => item.format === format);
  const moments = useMemo(() => {
    const byId = new Map(objects.map((object) => [object.id, object]));
    const overrides = new Map(story.canvas?.moments.map((moment) => [moment.momentId, moment.title]) ?? []);
    return story.momentIds.map((id) => byId.get(id)).filter((object): object is MomentObject => Boolean(object)).map((object) => ({ ...object, caption: overrides.get(object.id) ?? object.caption }));
  }, [objects, story.canvas, story.momentIds]);
  const photoCount = moments.filter((moment) => moment.kind === "photo").length;
  const photos = moments.filter((moment) => moment.kind === "photo");
  const suggestedHeroMoment = useMemo(() => {
    const chapters = story.canvas?.blueprint?.chapters ?? story.blueprint?.chapters ?? [];
    const heroChapter = chapters.find((chapter) => chapter.beat === "turning-point") ?? chapters.find((chapter) => chapter.beat === "highlight");
    return photos.find((photo) => heroChapter?.momentIds.includes(photo.id)) ?? photos[Math.min(photos.length - 1, Math.max(0, Math.round((photos.length - 1) * .62)))];
  }, [photos, story.blueprint?.chapters, story.canvas?.blueprint?.chapters]);
  const heroMomentId = heroMomentSelection || suggestedHeroMoment?.id || "";
  const heroPhotoIndex = photos.findIndex((photo) => photo.id === heroMomentId);
  const directorPlan = useMemo(() => buildMotionPlan(photoCount, heroPhotoIndex < 0 ? undefined : heroPhotoIndex), [heroPhotoIndex, photoCount]);
  const directorChecks = useMemo(() => assessMotionPlan(directorPlan, photoCount), [directorPlan, photoCount]);
  const expectedSlideCount = Math.min(Math.max(2, photoCount + 2), target.profile.maxSlides ?? 10);
  const status = useQuery({
    queryKey: ["social-exports", story.spaceId, story.id],
    queryFn: () => api.getSocialExports(story.spaceId, story.id),
    enabled: open,
    staleTime: 10_000,
    retry: 1,
  });
  const isBusy = phase !== "idle";

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isBusy) return;
      if (previewExpanded) setPreviewExpanded(false);
      else onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isBusy, onClose, open, previewExpanded]);

  useEffect(() => () => { asset?.urls.forEach((url) => URL.revokeObjectURL(url)); }, [asset]);

  useEffect(() => {
    setIncludeLocation(Boolean(story.location));
    setIncludeDate(true);
    setHeroMomentSelection("");
    setSavedDirectorPlan(null);
    setShareCaption(initialShareCaption(story));
    setAppearanceChanged(false);
    setError("");
    setSaveError("");
    setSaveState("idle");
  }, [story.id, story.location]);

  useEffect(() => {
    if (!asset || window.innerWidth >= 1024) return;
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ block: "start" }));
  }, [asset]);

  function replaceAsset(next: ExportAsset | null) {
    setPreviewIndex(0);
    setPreviewExpanded(false);
    setPreviewZoom(1);
    setVideoPlaying(false);
    setVideoMuted(true);
    setVideoProgress(0);
    setVideoDuration(0);
    setAsset((current) => {
      current?.urls.forEach((url) => URL.revokeObjectURL(url));
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
    setSaveError("");
    setSaveState("idle");
  }

  function downloadForTarget(next: SocialTarget, source: ExportAsset) {
    source.urls.forEach((url, index) => {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename(story, next, index, source.urls.length);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  async function downloadWithCaption() {
    if (!asset) return;
    downloadForTarget(target, asset);
    try {
      await navigator.clipboard.writeText(shareCaption);
      toast.success(asset.format === "image" ? `${asset.urls.length} slides downloaded and caption copied` : "Video downloaded and caption copied");
    } catch {
      toast.success(asset.format === "image" ? `${asset.urls.length} slides downloaded` : "Video downloaded");
    }
  }

  async function fetchSaved(next: SocialTarget) {
    setError("");
    setPhase("loading");
    setProgress(0.35);
    try {
      const count = Math.max(1, status.data?.[next.preset] ?? 1);
      const responses = await Promise.all(Array.from({ length: count }, (_, index) => fetch(
        api.socialExportUrl(story.spaceId, story.id, next.preset, false, next.format === "image" ? index : undefined),
        { credentials: "include" },
      )));
      if (responses.some((response) => !response.ok)) throw new Error("The saved export could not be opened");
      const blobs = await Promise.all(responses.map((response) => response.blob()));
      const nextAsset = { blobs, format: next.format, preset: next.preset, urls: blobs.map((blob) => URL.createObjectURL(blob)) } satisfies ExportAsset;
      replaceAsset(nextAsset);
      setProgress(1);
      setSaveState("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The saved export could not be opened");
    } finally {
      setPhase("idle");
    }
  }

  async function saveRendered(next: SocialTarget, rendered: Blob[]) {
    saveControllerRef.current?.abort();
    const controller = new AbortController();
    const attempt = ++saveAttemptRef.current;
    saveControllerRef.current = controller;
    setSaveState("saving");
    setSaveError("");
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    try {
      const uploads = rendered.map((blob, index) => {
        const sourceExtension = blob.type.includes("mp4") ? "mp4" : blob.type.includes("jpeg") ? "jpg" : next.format === "video" ? "webm" : "png";
        return new File([blob], `story-${String(index + 1).padStart(2, "0")}.${sourceExtension}`, { type: blob.type });
      });
      await api.uploadSocialExport(story.spaceId, story.id, next.preset, uploads, controller.signal);
      if (attempt !== saveAttemptRef.current) return;
      window.localStorage.setItem(rendererVersionKey(story, next.preset), socialExportRendererVersion[next.format]);
      setSaveState("saved");
      await queryClient.invalidateQueries({ queryKey: ["social-exports", story.spaceId, story.id] });
    } catch (cause) {
      if (attempt !== saveAttemptRef.current) return;
      setSaveState("failed");
      setSaveError(cause instanceof DOMException && cause.name === "AbortError"
        ? "The reusable copy took too long to save. Your preview is still ready to share or download."
        : "The reusable copy could not be saved. Your preview is still ready to share or download.");
    } finally {
      window.clearTimeout(timeout);
      if (attempt === saveAttemptRef.current) saveControllerRef.current = null;
    }
  }

  async function generate(next: SocialTarget) {
    saveControllerRef.current?.abort();
    saveAttemptRef.current += 1;
    setError("");
    setSaveError("");
    setSaveState("idle");
    replaceAsset(null);
    setProgress(0);
    setPhase("rendering");
    try {
      const director = next.format === "video"
        ? await api.createDirectorPlan(story.spaceId, story.id, { heroMomentId: heroMomentId || undefined })
        : null;
      if (director) setSavedDirectorPlan(director.plan);
      const rendered = await generateSocialExport({
        story,
        moments,
        format: next.format,
        heroMomentId: next.format === "video" ? heroMomentId || undefined : undefined,
        directorPlan: director?.plan,
        includeLocation,
        includeDate,
        outputWidth: next.width,
        outputHeight: next.height,
        profile: next.profile,
        onProgress: setProgress,
      });
      const nextAsset = { blobs: rendered, format: next.format, preset: next.preset, urls: rendered.map((blob) => URL.createObjectURL(blob)) } satisfies ExportAsset;
      replaceAsset(nextAsset);
      setProgress(1);
      toast.success(`${next.platform} preview ready`);
      void saveRendered(next, rendered);
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
    const savedWithCurrentRenderer = window.localStorage.getItem(rendererVersionKey(story, next.preset)) === socialExportRendererVersion[next.format];
    if (!appearanceChanged && status.data?.[next.preset] && savedWithCurrentRenderer) await fetchSaved(next);
    else await generate(next);
  }

  async function shareToApps() {
    if (!asset) return;
    const files = asset.blobs.map((blob, index) => new File([blob], filename(story, target, index, asset.blobs.length), { type: blob.type }));
    if (!navigator.share || (navigator.canShare && !navigator.canShare({ files }))) {
      await downloadWithCaption();
      return;
    }
    try {
      await navigator.share({ files, title: story.title, text: shareCaption });
      toast.success("Shared from Zo Moments");
    } catch (cause) {
      if (isShareCancellation(cause)) return;
      await downloadWithCaption();
    }
  }

  async function toggleVideoPlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
  }

  if (!open) return null;
  const styleLabel = story.styleSource === "auto" ? `Auto · ${styleNames[story.style]}` : styleNames[story.style];
  const aspectRatio = `${target.width} / ${target.height}`;
  const activePreviewUrl = asset?.urls[Math.min(previewIndex, asset.urls.length - 1)];
  const previewPhoto = moments.find((moment) => moment.kind === "photo");
  const previewPhotoUrl = previewPhoto ? api.objectContentUrl(previewPhoto.spaceId, previewPhoto.id) : "";
  const expandedPreviewWidth = `min(${previewZoom * 92}vw, ${previewZoom * 78 * (target.width / target.height)}dvh)`;
  const zoomBy = (amount: number) => setPreviewZoom((current) => Math.min(2, Math.max(.5, Math.round((current + amount) * 4) / 4)));
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-[#102019]/70 backdrop-blur-md sm:place-items-center" role="presentation" onMouseDown={() => { if (!isBusy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="social-share-title" className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-[#fff8ec] shadow-[0_40px_120px_rgba(8,18,13,.45)] sm:h-[94dvh] sm:max-w-[76rem] sm:rounded-[36px]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="relative z-20 shrink-0 border-b border-[#ded2c1] bg-[#fff8ec]/95 px-3 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] backdrop-blur-lg sm:px-7 sm:py-5">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,.82fr)_auto] lg:items-end">
            <div className="pr-12 lg:pr-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#a9503f] sm:mb-2 sm:gap-2 sm:text-[10px] sm:tracking-[.18em]"><Share2 className="size-3.5 sm:size-4" />Share this story <span className="rounded-full bg-[#e8ded0] px-2 py-0.5 text-[#526158] sm:px-2.5 sm:py-1">{styleLabel}</span></div>
              <h2 id="social-share-title" className="font-display text-[1.45rem] leading-[.95] text-[#26372f] sm:text-[2.35rem]">Turn it into something shareable.</h2>
            </div>
          <div>
            <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[.16em] text-[#8c594d] sm:mb-2 sm:text-[9px] sm:tracking-[.18em]">1 · Choose format</p>
            <div className="flex items-center gap-1 rounded-[16px] border border-[#d8c9b7] bg-[#e9dfd1] p-1 sm:rounded-[18px]" aria-label="Choose export format">
              <button type="button" onClick={() => chooseFormat("image")} aria-pressed={format === "image"} className={cn("flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[12px] px-2 py-2 text-[11px] font-bold transition sm:gap-2 sm:rounded-[14px] sm:px-3 sm:py-2.5 sm:text-xs", format === "image" ? "bg-[#fffdf8] text-[#26372f] shadow-[0_5px_18px_rgba(42,48,42,.12)]" : "text-[#756d63] hover:text-[#34443a]")}><Image className="size-4" /><span>Image carousel</span><span className={cn("hidden rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[.12em] sm:inline", format === "image" ? "bg-[#a9503f] text-white" : "bg-[#d8cbbb] text-[#6f675d]")}>JPEG</span></button>
              <button type="button" onClick={() => chooseFormat("video")} aria-pressed={format === "video"} className={cn("flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[12px] px-2 py-2 text-[11px] font-bold transition sm:gap-2 sm:rounded-[14px] sm:px-3 sm:py-2.5 sm:text-xs", format === "video" ? "bg-[#26372f] text-[#fff8ec] shadow-[0_5px_18px_rgba(22,38,30,.22)]" : "text-[#756d63] hover:text-[#34443a]")}><Film className="size-4" /><span>Motion story</span><span className={cn("hidden rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[.12em] sm:inline", format === "video" ? "bg-[#efc46f] text-[#26372f]" : "bg-[#d8cbbb] text-[#6f675d]")}>MP4</span></button>
            </div>
          </div>
            <button type="button" onClick={onClose} disabled={isBusy} className="absolute right-3 top-[max(.75rem,env(safe-area-inset-top))] grid size-10 shrink-0 place-items-center rounded-full bg-[#eee5d8] text-[#526158] transition hover:bg-[#e3d8c8] disabled:opacity-40 sm:right-7 sm:top-5 sm:size-11 lg:static lg:self-start" aria-label="Close sharing"><X className="size-5" /></button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:gap-5 sm:p-6 lg:grid-cols-[.88fr_1.12fr] lg:overflow-hidden">
          <div className="grid content-start gap-4 sm:gap-5 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c594d]">2 · Choose what appears</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[16px] border border-[#ded3c3] bg-[#fffdf8] px-3.5 py-3 text-xs font-semibold text-[#34443a]">Story date<input type="checkbox" checked={includeDate} disabled={isBusy} onChange={(event) => { setIncludeDate(event.target.checked); setAppearanceChanged(true); replaceAsset(null); }} className="size-5 accent-[#a9503f]" /></label>
                <label className={cn("flex items-center justify-between gap-3 rounded-[16px] border border-[#ded3c3] bg-[#fffdf8] px-3.5 py-3 text-xs font-semibold text-[#34443a]", story.location ? "cursor-pointer" : "opacity-45")}>Place<input type="checkbox" checked={includeLocation} disabled={isBusy || !story.location} onChange={(event) => { setIncludeLocation(event.target.checked); setAppearanceChanged(true); replaceAsset(null); }} className="size-5 accent-[#a9503f]" /></label>
              </div>
              {format === "video" ? <div className="mt-3 rounded-[20px] border border-[#d4c4ad] bg-[linear-gradient(135deg,#fffdf8,#f3eadc)] p-4 shadow-[0_10px_25px_rgba(74,59,40,.06)]">
                <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#26372f] text-[#efc46f]"><Clapperboard className="size-4" /></span><div><p className="text-xs font-bold text-[#26372f]">Director's cut</p><p className="mt-0.5 text-[11px] leading-4 text-[#756d63]">Choose the image where the film should peak. Everything else leads into it, then resolves into the closing card.</p></div></div>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Choose payoff moment">
                  {photos.map((photo, index) => <button key={photo.id} type="button" disabled={isBusy} onClick={() => { setHeroMomentSelection(photo.id); setAppearanceChanged(true); replaceAsset(null); }} aria-pressed={photo.id === heroMomentId} className={cn("relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition", photo.id === heroMomentId ? "border-[#a9503f] shadow-[0_0_0_3px_rgba(169,80,63,.13)]" : "border-transparent opacity-65 hover:opacity-100")}>
                    <img src={api.objectContentUrl(photo.spaceId, photo.id)} alt={`Set ${photo.caption || photo.name} as the payoff`} className="size-full object-cover" />
                    <span className={cn("absolute inset-x-1 bottom-1 rounded-md px-1 py-0.5 text-[8px] font-bold uppercase tracking-[.1em]", photo.id === heroMomentId ? "bg-[#a9503f] text-white" : "bg-[#14271f]/78 text-white")}>{photo.id === heroMomentId ? "Payoff" : `Scene ${index + 1}`}</span>
                  </button>)}
                </div>
                <div className="mt-3 grid gap-1.5 border-t border-[#ddcfbc] pt-3">{directorChecks.map((check) => <div key={check.id} className="flex gap-2 text-[10px] leading-4 text-[#625d54]"><Check className={cn("mt-0.5 size-3 shrink-0", check.status === "pass" ? "text-[#3f7658]" : "text-[#a9503f]")} /><span><strong className="text-[#3d493f]">{check.label}.</strong> {check.detail}</span></div>)}</div>
                {savedDirectorPlan ? <p className="mt-3 rounded-xl bg-[#e7efe8] px-3 py-2 text-[10px] leading-4 text-[#3f6650]"><strong>Zo production plan saved.</strong> {savedDirectorPlan.shots.length} scenes are cached for this exact story and payoff choice.</p> : null}
              </div> : null}
              <label className="mt-3 block rounded-[20px] border border-[#ded3c3] bg-[#fffdf8] p-4">
                <span className="flex items-center justify-between gap-3 text-xs font-bold text-[#34443a]"><span>Post caption</span><span className="font-medium text-[#8a8176]">{shareCaption.length}/500</span></span>
                <textarea value={shareCaption} maxLength={500} disabled={isBusy} onChange={(event) => setShareCaption(event.target.value)} rows={4} className="mt-3 w-full resize-y bg-transparent text-sm leading-6 text-[#4f5c54] outline-none placeholder:text-[#9a9186]" placeholder="Write the caption that should travel with your story…" />
              </label>
            </section>

            <section>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#8c594d]">3 · Preview and export</p>
              <p className="mb-3 text-xs leading-5 text-[#756d63]">Select a destination to build its crop, safe area and pacing. The preview appears first; select it again to download.</p>
              {format === "video" ? <p className="mb-3 rounded-[14px] bg-[#e8efe8] px-3 py-2 text-[11px] leading-4 text-[#496052]"><strong>Directed motion:</strong> the photos stay front and centre while the opening, payoff, transitions and soundtrack follow one deliberate arc.</p> : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {availableTargets.map((item) => <button key={item.id} type="button" disabled={isBusy} onClick={() => void exportTo(item)} aria-label={asset?.preset === item.preset ? `Download for ${item.platform} ${item.placement}` : `Preview for ${item.platform} ${item.placement}`} className={cn("relative rounded-[16px] border px-3 py-3 text-left transition disabled:cursor-wait disabled:opacity-55", item.id === target.id ? "border-[#a9503f] bg-[#fffdf8] shadow-[0_8px_22px_rgba(169,80,63,.1)]" : "border-[#ded3c3] bg-[#f3ebdf] hover:border-[#b9aa96]")}>
                  {asset?.preset === item.preset ? <Download className="absolute right-2.5 top-2.5 size-3.5 text-[#3e6651]" /> : <Eye className="absolute right-2.5 top-2.5 size-3.5 text-[#a9503f]" />}
                  <strong className="block pr-5 text-xs text-[#26372f]">{item.platform}</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[#756d63]">{asset?.preset === item.preset && asset.format === "image" ? `${asset.urls.length} slides ready · tap to download` : item.placement}</span>
                </button>)}
              </div>
              <p className="mt-3 text-[11px] text-[#827a70]">Selected: {target.width} × {target.height}px · {target.format === "image" ? asset?.format === "image" ? `${asset.urls.length}-slide JPEG carousel` : `${expectedSlideCount} slides from ${photoCount} ${photoCount === 1 ? "photo" : "photos"}` : "H.264 MP4"} · destination-safe composition</p>
            </section>

            <div className="flex gap-2.5 rounded-[16px] bg-[#e8efe8] p-3 text-[11px] leading-4 text-[#496052] sm:gap-3 sm:rounded-[20px] sm:p-4 sm:text-xs sm:leading-5"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><div className="min-w-0"><p className={cn(saveState !== "idle" && "hidden sm:block")}><strong>Private until you post.</strong> Zo Moments never publishes without opening your device’s confirmation screen.</p>{saveState !== "idle" ? <p className="flex items-center gap-2 font-semibold sm:mt-2">{saveState === "saving" ? <><Spinner />Saving reusable copy…</> : saveState === "saved" ? <><Cloud className="size-4" />Reusable copy saved</> : <><CloudAlert className="size-4" /><span>{saveError}</span></>}</p> : null}</div></div>
            {error ? <p className="rounded-[18px] bg-[#f6dfd8] px-4 py-3 text-sm text-[#8a372b]">{error}</p> : null}
          </div>

          <aside ref={previewRef} className="relative flex min-h-[22rem] scroll-mt-32 flex-col items-center justify-center gap-3 overflow-hidden rounded-[20px] bg-[#15271f] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)] sm:min-h-[28rem] sm:scroll-mt-36 sm:rounded-[28px] sm:p-5 lg:h-full lg:min-h-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(239,196,111,.16),transparent_28%),radial-gradient(circle_at_88%_90%,rgba(169,80,63,.13),transparent_30%)]" />
            <div className="relative z-10 flex w-full items-center justify-between gap-3">
              <div className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-[.16em] text-[#efc46f]">Live preview</span><strong className="mt-0.5 block truncate text-sm text-[#fff8ec]">{target.platform} <span className="font-normal text-white/45">· {target.placement}</span></strong></div>
              {asset && activePreviewUrl && !isBusy ? <button type="button" onClick={() => { setPreviewZoom(1); setPreviewExpanded(true); }} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#fff8ec]/95 px-3 text-xs font-bold text-[#26372f] shadow-lg transition hover:bg-white" aria-label="Expand export preview"><Maximize2 className="size-4" /><span className="hidden min-[390px]:inline">Expand</span></button> : null}
            </div>
            {asset && activePreviewUrl ? asset.format === "image"
              ? <div className="relative grid place-items-center">
                <img src={activePreviewUrl} alt={`${target.platform} carousel slide ${previewIndex + 1} of ${asset.urls.length} for ${story.title}`} className="max-h-[min(58dvh,32rem)] w-auto max-w-full rounded-[14px] shadow-[0_22px_60px_rgba(0,0,0,.4)] sm:max-h-[27rem] sm:rounded-[18px]" />
                {asset.urls.length > 1 ? <>
                  <button type="button" onClick={() => setPreviewIndex((index) => (index - 1 + asset.urls.length) % asset.urls.length)} className="absolute left-2 grid size-11 place-items-center rounded-full bg-[#fff8ec]/90 text-[#26372f] shadow-lg transition hover:bg-white" aria-label="Previous carousel slide"><ChevronLeft className="size-5" /></button>
                  <button type="button" onClick={() => setPreviewIndex((index) => (index + 1) % asset.urls.length)} className="absolute right-2 grid size-11 place-items-center rounded-full bg-[#fff8ec]/90 text-[#26372f] shadow-lg transition hover:bg-white" aria-label="Next carousel slide"><ChevronRight className="size-5" /></button>
                  <div className="absolute bottom-3 rounded-full bg-[#14271f]/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#fff8ec]">Slide {previewIndex + 1} of {asset.urls.length}</div>
                </> : null}
              </div>
              : <div className="group relative max-h-[min(58dvh,34rem)] max-w-full shrink-0 overflow-hidden rounded-[14px] bg-black shadow-[0_22px_60px_rgba(0,0,0,.35)] sm:rounded-[18px]">
                <video ref={videoRef} src={activePreviewUrl} autoPlay loop muted={videoMuted} playsInline onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setVideoProgress(event.currentTarget.duration ? event.currentTarget.currentTime / event.currentTarget.duration : 0)} onPlay={() => setVideoPlaying(true)} onPause={() => setVideoPlaying(false)} className="max-h-[min(58dvh,34rem)] w-auto max-w-full" />
                <button type="button" onClick={() => void toggleVideoPlayback()} className="absolute inset-0 grid place-items-center" aria-label={videoPlaying ? "Pause motion story" : "Play motion story"} aria-pressed={videoPlaying}>
                  {!videoPlaying ? <span className="grid size-14 place-items-center rounded-full border border-white/25 bg-[#102019]/75 text-white shadow-xl backdrop-blur-md"><Play className="ml-0.5 size-6 fill-current" /></span> : null}
                </button>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(7,18,12,.88),transparent)] px-3 pb-3 pt-12 text-white">
                  <div className="h-1 overflow-hidden rounded-full bg-white/25"><div className="h-full origin-left rounded-full bg-[#efc46f]" style={{ transform: `scaleX(${videoProgress})` }} /></div>
                  <div className="pointer-events-auto mt-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[.12em]"><span className="flex items-center gap-1.5">{videoPlaying ? <Pause className="size-3" /> : <Play className="size-3 fill-current" />}{videoTime((videoDuration || target.profile.durationMs / 1000) * videoProgress)} / {videoTime(videoDuration || target.profile.durationMs / 1000)}</span><button type="button" onClick={() => setVideoMuted((muted) => !muted)} className="flex items-center gap-1.5 text-white/80 transition hover:text-white">{videoMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}{videoMuted ? "Tap for sound" : "Sound on"}</button></div>
                </div>
              </div>
              : <div className="relative grid max-h-[32rem] w-[88%] max-w-[22rem] overflow-hidden rounded-[18px] border border-white/15 bg-[#304a3e] text-center shadow-[0_22px_60px_rgba(0,0,0,.35)] sm:w-[74%] sm:rounded-[20px]" style={{ aspectRatio }}>
                {previewPhotoUrl ? <img src={previewPhotoUrl} alt="" className="absolute inset-0 size-full object-cover" /> : null}
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(9,25,18,.96),rgba(9,25,18,.14)_72%),radial-gradient(circle_at_65%_22%,rgba(239,196,111,.22),transparent_28%)]" />
                <div className="relative flex flex-col items-center justify-end p-6 text-[#fff8ec]"><span className="grid size-11 place-items-center rounded-full border border-white/15 bg-[#102019]/55 backdrop-blur-md">{target.format === "image" ? <Image className="size-5" /> : <Film className="size-5" />}</span><strong className="mt-4 font-display text-3xl leading-none">{story.title}</strong><span className="mt-3 text-[9px] font-bold uppercase tracking-[.18em] text-[#efc46f]">{target.width} × {target.height}px · {styleLabel}</span><button type="button" disabled={isBusy} onClick={() => void generate(target)} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f0c681] px-5 text-xs font-bold text-[#26372f] shadow-[0_10px_30px_rgba(0,0,0,.25)] transition hover:bg-[#f6d795] disabled:opacity-50"><Eye className="size-4" />Build {target.platform} preview</button></div>
              </div>}
            {asset?.format === "image" && asset.urls.length > 1 && !isBusy ? <div className="relative z-10 flex w-full gap-2 overflow-x-auto pb-1" aria-label="Carousel slides">{asset.urls.map((url, index) => <button key={url} type="button" onClick={() => setPreviewIndex(index)} aria-label={`Open slide ${index + 1}`} aria-current={previewIndex === index} className={cn("relative h-14 shrink-0 overflow-hidden rounded-[10px] border-2 transition", previewIndex === index ? "w-11 border-[#efc46f] opacity-100" : "w-9 border-transparent opacity-45 hover:opacity-80")}><img src={url} alt="" className="size-full object-cover" /><span className="absolute bottom-0 right-0 grid size-4 place-items-center rounded-tl-md bg-[#102019]/85 text-[8px] font-bold text-white">{index + 1}</span></button>)}</div> : null}
            {asset && !isBusy ? <div className="relative z-10 grid w-full gap-2 sm:grid-cols-[1fr_auto]"><Button className="h-12 bg-[#f0c681] text-[#26372f] shadow-none hover:bg-[#f6d795]" onClick={shareToApps}><Smartphone className="size-4" />{asset.format === "image" ? `Share ${asset.urls.length}-slide carousel` : "Share to apps"}</Button><Button className="text-[#fff8ec] hover:bg-white/10 hover:text-white" variant="ghost" onClick={() => void generate(target)}><RefreshCw className="size-4" />Regenerate</Button></div> : null}
            {isBusy ? <div className="absolute inset-0 z-10 grid place-items-center bg-[#15271f]/88 p-6 backdrop-blur-sm" role="status" aria-live="polite">
              <div className="w-full max-w-xs rounded-[24px] border border-white/10 bg-[#26372f] p-6 text-center text-[#fff8ec] shadow-[0_24px_70px_rgba(0,0,0,.35)]">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/10"><Spinner /></span>
                <strong className="mt-5 block font-display text-2xl leading-tight">{phase === "rendering" ? `Rendering for ${target.platform}` : "Opening saved export"}</strong>
                <p className="mt-2 text-xs leading-5 text-white/60">{phase === "rendering" ? target.format === "video" ? "Composing the opening, visual payoff and final frame." : "Composing a photo-led cover, editorial scenes and final frame." : "Preparing the existing master for preview."}</p>
                <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-[.14em] text-[#efc46f]"><span>Progress</span><span>{Math.round(progress * 100)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-full origin-left rounded-full bg-[#efc46f]" style={{ transform: `scaleX(${Math.max(0.05, progress)})` }} /></div>
              </div>
            </div> : null}
          </aside>
        </div>
      </section>
      {previewExpanded && asset && activePreviewUrl ? <section role="dialog" aria-modal="true" aria-label="Expanded export preview" className="fixed inset-0 z-[100] flex w-screen max-w-[100vw] flex-col overflow-hidden bg-[#102019] text-[#fff8ec]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="relative z-20 flex items-center justify-end gap-2 border-b border-white/10 bg-[#102019]/95 px-2 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] backdrop-blur-xl sm:justify-between sm:gap-3 sm:px-5 sm:py-3">
          <div className="hidden min-w-0 sm:block"><strong className="block truncate text-sm">{target.platform} preview</strong><span className="block text-[10px] uppercase tracking-[.14em] text-white/55">{asset.format === "image" ? `Slide ${previewIndex + 1} of ${asset.urls.length}` : target.placement}</span></div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              <button type="button" onClick={() => zoomBy(-.25)} disabled={previewZoom <= .5} className="grid size-9 place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-30 sm:size-10" aria-label="Shrink preview"><ZoomOut className="size-4" /></button>
              <button type="button" onClick={() => setPreviewZoom(1)} className="min-w-12 rounded-full px-1.5 py-2 text-xs font-bold transition hover:bg-white/10 sm:min-w-14 sm:px-2" aria-label="Reset preview zoom">{Math.round(previewZoom * 100)}%</button>
              <button type="button" onClick={() => zoomBy(.25)} disabled={previewZoom >= 2} className="grid size-9 place-items-center rounded-full transition hover:bg-white/10 disabled:opacity-30 sm:size-10" aria-label="Enlarge preview"><ZoomIn className="size-4" /></button>
            </div>
            <button type="button" onClick={() => setPreviewExpanded(false)} className="grid size-9 place-items-center rounded-full bg-[#f0c681] text-[#26372f] transition hover:bg-[#f6d795] sm:size-10" aria-label="Collapse export preview"><Minimize2 className="size-4" /></button>
          </div>
        </header>
        <div className="relative min-h-0 w-full max-w-full flex-1 overflow-auto p-4 sm:p-6">
          <div className="flex min-h-full min-w-full items-center justify-center">
            {asset.format === "image"
              ? <img src={activePreviewUrl} alt={`${target.platform} carousel slide ${previewIndex + 1} of ${asset.urls.length} for ${story.title}`} className="h-auto max-w-none shrink-0 rounded-[18px] shadow-[0_28px_90px_rgba(0,0,0,.5)] transition-[width] duration-200" style={{ width: expandedPreviewWidth }} />
              : <video src={activePreviewUrl} controls autoPlay loop muted playsInline className="h-auto max-w-none shrink-0 rounded-[18px] shadow-[0_28px_90px_rgba(0,0,0,.5)] transition-[width] duration-200" style={{ width: expandedPreviewWidth }} />}
          </div>
          {asset.format === "image" && asset.urls.length > 1 ? <>
            <button type="button" onClick={() => setPreviewIndex((index) => (index - 1 + asset.urls.length) % asset.urls.length)} className="fixed left-2 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[#fff8ec]/95 text-[#26372f] shadow-xl transition hover:bg-white sm:left-5 sm:size-12" aria-label="Previous carousel slide"><ChevronLeft className="size-6" /></button>
            <button type="button" onClick={() => setPreviewIndex((index) => (index + 1) % asset.urls.length)} className="fixed right-2 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[#fff8ec]/95 text-[#26372f] shadow-xl transition hover:bg-white sm:right-5 sm:size-12" aria-label="Next carousel slide"><ChevronRight className="size-6" /></button>
          </> : null}
        </div>
      </section> : null}
    </div>
  );
}
