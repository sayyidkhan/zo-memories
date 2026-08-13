import { api } from "@zo-moments/sdk";
import type { MomentObject, Story, StoryStyle } from "@zo-moments/types";

export type SocialExportFormat = "image" | "video";

export interface SocialExportProfile {
  id: string;
  safeTop: number;
  safeRight: number;
  safeBottom: number;
  safeLeft: number;
  durationMs: number;
  maxPhotos: number;
  videoBitrate: number;
  cropScale: number;
}

interface SocialExportOptions {
  story: Story;
  moments: MomentObject[];
  format: SocialExportFormat;
  includeLocation: boolean;
  includeDate: boolean;
  outputWidth: number;
  outputHeight: number;
  profile: SocialExportProfile;
  onProgress?: (progress: number) => void;
}

interface LoadedPhoto {
  image: HTMLImageElement;
  moment: MomentObject;
  release: () => void;
}

const palette = {
  ink: "#20372d",
  cream: "#fff8ec",
  paper: "#f1e7d7",
  sage: "#cdd8ce",
  gold: "#efc46f",
  coral: "#c86c57",
};

function roundedPath(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function fillRounded(context: CanvasRenderingContext2D, colour: string, x: number, y: number, width: number, height: number, radius: number) {
  context.save();
  context.fillStyle = colour;
  roundedPath(context, x, y, width, height, radius);
  context.fill();
  context.restore();
}

function cover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, scale = 1, offsetX = 0) {
  const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight) * scale;
  const sourceWidth = width / ratio;
  const sourceHeight = height / ratio;
  const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2 + offsetX);
  const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) / 2);
  context.drawImage(image, sourceX, sourceY, Math.min(sourceWidth, image.naturalWidth - sourceX), Math.min(sourceHeight, image.naturalHeight - sourceY), x, y, width, height);
}

function clippedPhoto(context: CanvasRenderingContext2D, photo: LoadedPhoto | undefined, x: number, y: number, width: number, height: number, radius: number, scale = 1, offsetX = 0) {
  context.save();
  roundedPath(context, x, y, width, height, radius);
  context.clip();
  if (photo) cover(context, photo.image, x, y, width, height, scale, offsetX);
  else {
    const gradient = context.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, palette.sage);
    gradient.addColorStop(1, "#789081");
    context.fillStyle = gradient;
    context.fillRect(x, y, width, height);
  }
  context.restore();
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.join(" ").length < text.trim().length && lines.length) {
    while (context.measureText(`${lines.at(-1)}…`).width > maxWidth) lines[lines.length - 1] = lines.at(-1)!.slice(0, -1);
    lines[lines.length - 1] = `${lines.at(-1)}…`;
  }
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
  return lines.length;
}

function dateRange(moments: MomentObject[]) {
  if (!moments.length) return "A shared story";
  const ordered = [...moments].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const first = new Date(ordered[0]!.occurredAt);
  const last = new Date(ordered.at(-1)!.occurredAt);
  const format = (date: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  return first.toDateString() === last.toDateString() ? format(first) : `${format(first)} – ${format(last)}`;
}

function metadata(story: Story, moments: MomentObject[], includeLocation: boolean, includeDate: boolean) {
  return [includeDate ? dateRange(moments) : "", includeLocation ? story.location ?? "" : ""].filter(Boolean).join("  ·  ");
}

function safeArea(width: number, height: number, profile: SocialExportProfile) {
  return {
    top: height * profile.safeTop,
    right: width * profile.safeRight,
    bottom: height * profile.safeBottom,
    left: width * profile.safeLeft,
  };
}

function brand(context: CanvasRenderingContext2D, width: number, height: number, colour: string, profile: SocialExportProfile) {
  const safe = safeArea(width, height, profile);
  const side = Math.max(54, safe.left);
  const baseline = height - Math.max(46, safe.bottom);
  context.save();
  context.fillStyle = colour;
  context.font = "700 20px Georgia, serif";
  context.fillText("ZO MOMENTS", side, baseline);
  context.globalAlpha = 0.65;
  context.font = "600 16px sans-serif";
  context.textAlign = "right";
  context.fillText("A shared story", width - Math.max(54, safe.right), baseline - 1);
  context.restore();
}

function title(context: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, colour: string, size: number, maxLines = 3) {
  context.fillStyle = colour;
  context.font = `700 ${size}px Georgia, serif`;
  context.textBaseline = "top";
  return wrapText(context, value, x, y, width, size * 0.92, maxLines);
}

function drawClassic(context: CanvasRenderingContext2D, story: Story, moments: MomentObject[], photos: LoadedPhoto[], progress: number, showLocation: boolean, showDate: boolean, profile: SocialExportProfile) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, profile);
  const side = Math.max(62, safe.left);
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, width, height);
  const drift = Math.sin(progress * Math.PI * 2) * 6;
  clippedPhoto(context, photos[Math.floor(progress * Math.max(photos.length, 1)) % Math.max(photos.length, 1)], 58, 58, width - 116, height * 0.58, 24, 1.04, drift);
  context.fillStyle = palette.coral;
  context.font = "700 19px sans-serif";
  context.fillText("A STORY WE SHARE", side, height * 0.68);
  title(context, story.title, side, Math.min(height * 0.705, height - safe.bottom - 245), width - side - Math.max(62, safe.right), palette.ink, 67, 2);
  context.fillStyle = "#6f675d";
  context.font = "600 18px sans-serif";
  context.fillText(metadata(story, moments, showLocation, showDate), side, height - Math.max(108, safe.bottom + 58));
  brand(context, width, height, palette.ink, profile);
}

function drawFlipbook(context: CanvasRenderingContext2D, story: Story, moments: MomentObject[], photos: LoadedPhoto[], progress: number, showLocation: boolean, showDate: boolean, profile: SocialExportProfile) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, profile);
  context.fillStyle = palette.sage;
  context.fillRect(0, 0, width, height);
  const active = Math.floor(progress * Math.max(photos.length, 1)) % Math.max(photos.length, 1);
  for (let layer = 2; layer >= 0; layer -= 1) {
    context.save();
    context.translate(width / 2, height * 0.4);
    context.rotate(((layer - 1) * 2.1 * Math.PI) / 180);
    context.shadowColor = "rgba(31,49,40,.22)";
    context.shadowBlur = 35;
    fillRounded(context, palette.cream, -width * 0.39 + layer * 4, -height * 0.31 + layer * 5, width * 0.78, height * 0.62, 20);
    clippedPhoto(context, photos[(active + layer) % Math.max(photos.length, 1)], -width * 0.35 + layer * 4, -height * 0.275 + layer * 5, width * 0.7, height * 0.49, 12, 1.02);
    context.restore();
  }
  context.textAlign = "left";
  title(context, story.title, Math.max(width * 0.12, safe.left), Math.min(height * 0.755, height - safe.bottom - 230), width - Math.max(width * 0.24, safe.left + safe.right), palette.ink, 62, 2);
  context.fillStyle = "#536158";
  context.font = "600 18px sans-serif";
  context.textAlign = "center";
  context.fillText(metadata(story, moments, showLocation, showDate), width / 2, height - Math.max(105, safe.bottom + 56));
  context.textAlign = "left";
  brand(context, width, height, palette.ink, profile);
}

function drawComic(context: CanvasRenderingContext2D, story: Story, moments: MomentObject[], photos: LoadedPhoto[], progress: number, showLocation: boolean, showDate: boolean, profile: SocialExportProfile) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, profile);
  context.fillStyle = "#efd168";
  context.fillRect(0, 0, width, height);
  const index = Math.floor(progress * Math.max(photos.length, 1)) % Math.max(photos.length, 1);
  const panels = [
    { x: 42, y: 44, w: width - 84, h: height * 0.45 },
    { x: 42, y: height * 0.525, w: width * 0.42, h: height * 0.24 },
    { x: width * 0.49, y: height * 0.525, w: width * 0.45 - 42, h: height * 0.24 },
  ];
  panels.forEach((panel, panelIndex) => {
    context.fillStyle = palette.ink;
    context.fillRect(panel.x - 7, panel.y - 7, panel.w + 14, panel.h + 14);
    clippedPhoto(context, photos[(index + panelIndex) % Math.max(photos.length, 1)], panel.x, panel.y, panel.w, panel.h, 0, 1.04);
  });
  fillRounded(context, palette.cream, 58, height * 0.705, width - 116, 128, 64);
  context.textAlign = "center";
  context.fillStyle = palette.ink;
  context.font = "900 25px sans-serif";
  context.fillText("AND THEN THIS HAPPENED…", width / 2, height * 0.747);
  context.textAlign = "left";
  title(context, story.title.toUpperCase(), Math.max(52, safe.left), Math.min(height * 0.825, height - safe.bottom - 205), width - Math.max(104, safe.left + safe.right), palette.ink, 58, 2);
  context.fillStyle = "#735b2d";
  context.font = "700 17px sans-serif";
  context.fillText(metadata(story, moments, showLocation, showDate), Math.max(54, safe.left), height - Math.max(102, safe.bottom + 54));
  brand(context, width, height, palette.ink, profile);
}

function drawScrapbook(context: CanvasRenderingContext2D, story: Story, moments: MomentObject[], photos: LoadedPhoto[], progress: number, showLocation: boolean, showDate: boolean, profile: SocialExportProfile) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, profile);
  context.fillStyle = "#e9dfcf";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(97,118,103,.14)";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 38) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y < height; y += 38) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  const index = Math.floor(progress * Math.max(photos.length, 1)) % Math.max(photos.length, 1);
  const cards = [
    { x: width * 0.08, y: height * 0.07, w: width * 0.58, h: height * 0.42, angle: -5 },
    { x: width * 0.43, y: height * 0.36, w: width * 0.48, h: height * 0.34, angle: 6 },
  ];
  cards.forEach((card, cardIndex) => {
    context.save();
    context.translate(card.x + card.w / 2, card.y + card.h / 2);
    context.rotate((card.angle * Math.PI) / 180);
    context.shadowColor = "rgba(62,46,27,.22)";
    context.shadowBlur = 28;
    fillRounded(context, palette.cream, -card.w / 2, -card.h / 2, card.w, card.h, 5);
    clippedPhoto(context, photos[(index + cardIndex) % Math.max(photos.length, 1)], -card.w / 2 + 18, -card.h / 2 + 18, card.w - 36, card.h - 90, 2, 1.03);
    context.restore();
  });
  context.save();
  context.translate(width * 0.06, height * 0.71);
  context.rotate((-2 * Math.PI) / 180);
  context.fillStyle = "rgba(200,108,87,.2)";
  context.fillRect(0, 0, width * 0.88, height * 0.17);
  title(context, story.title, width * 0.025, height * 0.022, width * 0.82, palette.coral, Math.min(64, width * 0.075), 2);
  context.restore();
  context.fillStyle = "#70675c";
  context.font = "600 18px sans-serif";
  context.fillText(metadata(story, moments, showLocation, showDate), Math.max(54, safe.left), height - Math.max(105, safe.bottom + 56));
  brand(context, width, height, palette.ink, profile);
}

function drawCinematic(context: CanvasRenderingContext2D, story: Story, moments: MomentObject[], photos: LoadedPhoto[], progress: number, showLocation: boolean, showDate: boolean, profile: SocialExportProfile) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, profile);
  const side = Math.max(54, safe.left);
  const index = Math.floor(progress * Math.max(photos.length, 1)) % Math.max(photos.length, 1);
  const localProgress = (progress * Math.max(photos.length, 1)) % 1;
  if (photos[index]) cover(context, photos[index]!.image, 0, 0, width, height, profile.cropScale + localProgress * 0.08, (localProgress - 0.5) * 14);
  else {
    context.fillStyle = palette.ink;
    context.fillRect(0, 0, width, height);
  }
  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, "rgba(8,20,14,.16)");
  shade.addColorStop(0.55, "rgba(8,20,14,.12)");
  shade.addColorStop(1, "rgba(8,20,14,.96)");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  context.fillStyle = palette.gold;
  context.font = "700 19px sans-serif";
  const titleTop = Math.min(height * 0.72, height - safe.bottom - 300);
  context.fillText(`SCENE ${String(index + 1).padStart(2, "0")}  ·  A SHARED STORY`, side, titleTop - 50);
  title(context, story.title, side, titleTop, width - side - Math.max(54, safe.right), palette.cream, 72, 3);
  context.fillStyle = "#e8ddcd";
  context.font = "600 18px sans-serif";
  context.fillText(metadata(story, moments, showLocation, showDate), side, height - Math.max(105, safe.bottom + 56));
  brand(context, width, height, palette.cream, profile);
}

function drawFrame(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], progress: number) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  const renderers: Record<StoryStyle, typeof drawClassic> = {
    classic: drawClassic,
    flipbook: drawFlipbook,
    comic: drawComic,
    scrapbook: drawScrapbook,
    cinematic: drawCinematic,
  };
  renderers[options.story.style](context, options.story, options.moments, photos, progress, options.includeLocation, options.includeDate, options.profile);
}

async function loadPhotos(moments: MomentObject[], maxPhotos: number, onProgress?: (progress: number) => void): Promise<LoadedPhoto[]> {
  const sources = moments.filter((moment) => moment.kind === "photo").slice(0, maxPhotos);
  const loaded: LoadedPhoto[] = [];
  for (const [index, moment] of sources.entries()) {
    const response = await fetch(api.objectContentUrl(moment.spaceId, moment.id), { credentials: "include" });
    if (!response.ok) throw new Error(`Could not load ${moment.name}`);
    const objectUrl = URL.createObjectURL(await response.blob());
    const image = new Image();
    image.src = objectUrl;
    try {
      await image.decode();
      loaded.push({ image, moment, release: () => URL.revokeObjectURL(objectUrl) });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
    onProgress?.(0.08 + ((index + 1) / Math.max(sources.length, 1)) * 0.2);
  }
  return loaded;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image could not be rendered")), "image/png", 0.96));
}

function videoMimeType() {
  const types = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function paintOutput(renderCanvas: HTMLCanvasElement, outputCanvas: HTMLCanvasElement, outputContext: CanvasRenderingContext2D) {
  outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputContext.drawImage(renderCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
}

async function recordVideo(renderCanvas: HTMLCanvasElement, renderContext: CanvasRenderingContext2D, outputCanvas: HTMLCanvasElement, outputContext: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[]) {
  if (!("MediaRecorder" in window) || typeof outputCanvas.captureStream !== "function") throw new Error("Video creation is not supported in this browser. Try the image format instead.");
  const stream = outputCanvas.captureStream(30);
  const mimeType = videoMimeType();
  const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: options.profile.videoBitrate });
  const chunks: BlobPart[] = [];
  recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
  const result = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener("error", () => reject(new Error("The video could not be recorded")));
    recorder.addEventListener("stop", () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" })));
  });
  const duration = options.profile.durationMs;
  const startedAt = performance.now();
  recorder.start(250);
  await new Promise<void>((resolve) => {
    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      drawFrame(renderContext, options, photos, progress === 1 ? 0.999 : progress);
      paintOutput(renderCanvas, outputCanvas, outputContext);
      options.onProgress?.(0.3 + progress * 0.55);
      if (progress < 1) requestAnimationFrame(animate);
      else resolve();
    };
    requestAnimationFrame(animate);
  });
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  return result;
}

export async function generateSocialExport(options: SocialExportOptions): Promise<Blob> {
  await document.fonts.ready;
  options.onProgress?.(0.04);
  const photos = await loadPhotos(options.moments, options.profile.maxPhotos, options.onProgress);
  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = options.format === "video" ? 720 : Math.min(1080, options.outputWidth);
  renderCanvas.height = Math.round(renderCanvas.width * (options.outputHeight / options.outputWidth));
  const renderContext = renderCanvas.getContext("2d");
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = options.outputWidth;
  outputCanvas.height = options.outputHeight;
  const outputContext = outputCanvas.getContext("2d");
  if (!renderContext || !outputContext) throw new Error("Your browser could not start the story renderer");
  try {
    if (options.format === "image") {
      drawFrame(renderContext, options, photos, 0.38);
      paintOutput(renderCanvas, outputCanvas, outputContext);
      options.onProgress?.(0.9);
      return await canvasBlob(outputCanvas);
    }
    return await recordVideo(renderCanvas, renderContext, outputCanvas, outputContext, options, photos);
  } finally {
    photos.forEach((photo) => photo.release());
  }
}
