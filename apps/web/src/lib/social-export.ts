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
  maxSlides?: number;
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

export interface CarouselPlanSlide {
  kind: "cover" | "moment" | "closing";
  photoIndexes: number[];
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
  return [includeDate ? story.canvas?.dateRange ?? dateRange(moments) : "", includeLocation ? story.canvas?.location ?? story.location ?? "" : ""].filter(Boolean).join("  ·  ");
}

function chapterForMoment(story: Story, momentId: string | undefined) {
  if (!momentId) return undefined;
  return (story.canvas?.blueprint ?? story.blueprint)?.chapters.find((chapter) => chapter.momentIds.includes(momentId));
}

function storyOpening(story: Story) {
  return story.canvas?.opening ?? story.opening;
}

function storyClosing(story: Story) {
  return story.canvas?.blueprint?.closing ?? story.blueprint?.closing ?? storyOpening(story);
}

function chapterNarration(story: Story, momentId: string | undefined) {
  return chapterForMoment(story, momentId)?.narration ?? storyOpening(story);
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
  context.font = `700 ${size}px Fraunces, Georgia, serif`;
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
  const photo = photos[Math.floor(progress * Math.max(photos.length, 1)) % Math.max(photos.length, 1)];
  clippedPhoto(context, photo, 58, 58, width - 116, height * 0.58, 24, 1.04, drift);
  context.fillStyle = palette.coral;
  context.font = "700 19px sans-serif";
  context.fillText("A STORY WE SHARE", side, height * 0.68);
  const titleTop = Math.min(height * 0.705, height - safe.bottom - 245);
  const titleLines = title(context, chapterForMoment(story, photo?.moment.id)?.title ?? story.title, side, titleTop, width - side - Math.max(62, safe.right), palette.ink, 67, 2);
  context.fillStyle = "#6f675d";
  context.font = "500 19px sans-serif";
  wrapText(context, chapterNarration(story, photo?.moment.id), side, titleTop + titleLines * 62 + 18, width - side - Math.max(62, safe.right), 27, 2);
  context.fillStyle = "#6f675d";
  context.font = "600 18px sans-serif";
  context.fillText(metadata(story, moments, showLocation, showDate), side, height - Math.max(108, safe.bottom + 58));
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
  title(context, chapterForMoment(story, photos[index]?.moment.id)?.title ?? story.title, width * 0.025, height * 0.022, width * 0.82, palette.coral, Math.min(64, width * 0.075), 2);
  context.restore();
  context.fillStyle = "#5f594f";
  context.font = "500 18px sans-serif";
  wrapText(context, chapterNarration(story, photos[index]?.moment.id), Math.max(54, safe.left), height * 0.885, width - Math.max(108, safe.left + safe.right), 25, 2);
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
  const titleLines = title(context, chapterForMoment(story, photos[index]?.moment.id)?.title ?? story.title, side, titleTop, width - side - Math.max(54, safe.right), palette.cream, 72, 3);
  context.fillStyle = "#e8ddcd";
  context.font = "500 19px sans-serif";
  wrapText(context, chapterNarration(story, photos[index]?.moment.id), side, titleTop + titleLines * 67 + 20, width - side - Math.max(54, safe.right), 27, 2);
  context.fillStyle = "#e8ddcd";
  context.font = "600 18px sans-serif";
  context.fillText(metadata(story, moments, showLocation, showDate), side, height - Math.max(105, safe.bottom + 56));
  brand(context, width, height, palette.cream, profile);
}

function drawFrame(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], progress: number) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  const renderer = options.story.style === "scrapbook" ? drawScrapbook : options.story.style === "cinematic" ? drawCinematic : drawClassic;
  renderer(context, options.story, options.moments, photos, progress, options.includeLocation, options.includeDate, options.profile);
}

export function buildCarouselPlan(photoCount: number, maxSlides: number): CarouselPlanSlide[] {
  const contentSlots = Math.max(1, maxSlides - 2);
  const moments = Array.from({ length: Math.min(photoCount, contentSlots) }, (_, slot) => {
    const start = Math.floor((slot * photoCount) / Math.min(photoCount, contentSlots));
    const end = Math.floor(((slot + 1) * photoCount) / Math.min(photoCount, contentSlots));
    return { kind: "moment" as const, photoIndexes: Array.from({ length: end - start }, (_, offset) => start + offset) };
  });
  return [
    { kind: "cover", photoIndexes: photoCount ? [0] : [] },
    ...moments,
    { kind: "closing", photoIndexes: Array.from({ length: Math.min(3, photoCount) }, (_, index) => photoCount - Math.min(3, photoCount) + index) },
  ];
}

function slideNumber(context: CanvasRenderingContext2D, options: SocialExportOptions, index: number, total: number, light = false) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  const badgeWidth = total >= 10 ? 92 : 78;
  const badgeX = width - Math.max(badgeWidth + 28, safe.right + badgeWidth);
  const badgeY = Math.max(28, safe.top * 0.55);
  fillRounded(context, light ? "rgba(18,34,27,.72)" : "rgba(255,248,236,.92)", badgeX, badgeY, badgeWidth, 40, 20);
  context.save();
  context.fillStyle = light ? palette.cream : palette.ink;
  context.font = "700 15px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`${index + 1} / ${total}`, badgeX + badgeWidth / 2, badgeY + 20);
  context.restore();
}

function storyRail(context: CanvasRenderingContext2D, options: SocialExportOptions, index: number, total: number, colour: string) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  const left = Math.max(54, safe.left);
  const right = width - Math.max(54, safe.right);
  const y = Math.max(38, safe.top * .55);
  context.save();
  context.globalAlpha = .32;
  context.strokeStyle = colour;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(left, y);
  context.lineTo(right, y);
  context.stroke();
  context.globalAlpha = 1;
  context.strokeStyle = colour;
  context.lineWidth = 5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(left, y);
  context.lineTo(left + ((right - left) * (index + 1)) / total, y);
  context.stroke();
  context.restore();
}

function photoTitle(story: Story, photo: LoadedPhoto | undefined) {
  if (!photo) return story.canvas?.title ?? story.title;
  return chapterForMoment(story, photo.moment.id)?.title ?? photo.moment.caption?.trim() ?? photo.moment.name.replace(/\.[^.]+$/, "");
}

function drawPhotoMosaic(context: CanvasRenderingContext2D, photos: LoadedPhoto[], x: number, y: number, width: number, height: number, radius: number) {
  if (photos.length <= 1) {
    clippedPhoto(context, photos[0], x, y, width, height, radius, 1.02);
    return;
  }
  const gap = 14;
  const leadWidth = photos.length === 2 ? (width - gap) / 2 : width * 0.62;
  clippedPhoto(context, photos[0], x, y, leadWidth, height, radius, 1.02);
  if (photos.length === 2) {
    clippedPhoto(context, photos[1], x + leadWidth + gap, y, width - leadWidth - gap, height, radius, 1.02);
    return;
  }
  if (photos.length > 3) {
    const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(photos.length * (width / height)))));
    const rows = Math.ceil(photos.length / columns);
    const cellWidth = (width - gap * (columns - 1)) / columns;
    const cellHeight = (height - gap * (rows - 1)) / rows;
    photos.forEach((photo, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      clippedPhoto(context, photo, x + column * (cellWidth + gap), y + row * (cellHeight + gap), cellWidth, cellHeight, Math.min(radius, 12), 1.02);
    });
    return;
  }
  const smallX = x + leadWidth + gap;
  const smallWidth = width - leadWidth - gap;
  const smallHeight = (height - gap) / 2;
  clippedPhoto(context, photos[1], smallX, y, smallWidth, smallHeight, radius, 1.02);
  clippedPhoto(context, photos[2], smallX, y + smallHeight + gap, smallWidth, smallHeight, radius, 1.02);
}

function drawCarouselCover(context: CanvasRenderingContext2D, options: SocialExportOptions, photo: LoadedPhoto | undefined, index: number, total: number) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  if (photo) cover(context, photo.image, 0, 0, width, height, options.profile.cropScale);
  else { context.fillStyle = palette.ink; context.fillRect(0, 0, width, height); }
  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, "rgba(9,24,17,.08)");
  shade.addColorStop(0.42, "rgba(9,24,17,.18)");
  shade.addColorStop(1, "rgba(9,24,17,.95)");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const side = Math.max(58, safe.left);
  context.fillStyle = palette.gold;
  context.font = "700 18px sans-serif";
  context.fillText("A JOURNEY WORTH KEEPING", side, Math.max(82, safe.top + 28));
  const heading = options.story.canvas?.title ?? options.story.title;
  const headingSize = heading.length > 34 ? 64 : 78;
  const titleTop = Math.min(height * 0.57, height - safe.bottom - 430);
  const titleLines = title(context, heading, side, titleTop, width - side - Math.max(58, safe.right), palette.cream, headingSize, 3);
  context.fillStyle = "rgba(255,248,236,.86)";
  context.font = "500 22px sans-serif";
  wrapText(context, storyOpening(options.story), side, titleTop + titleLines * headingSize * .92 + 30, width - side - Math.max(70, safe.right), 32, 3);
  context.fillStyle = palette.gold;
  context.font = "700 17px sans-serif";
  context.fillText(metadata(options.story, options.moments, options.includeLocation, options.includeDate), side, height - Math.max(112, safe.bottom + 64));
  brand(context, width, height, palette.cream, options.profile);
  storyRail(context, options, index, total, palette.gold);
  slideNumber(context, options, index, total, true);
}

function drawClassicCarouselMoment(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], index: number, total: number) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  const side = Math.max(54, safe.left);
  const variant = (index - 1) % 3;
  const lead = photos[0];
  const chapter = chapterForMoment(options.story, lead?.moment.id);
  context.fillStyle = variant === 2 ? palette.ink : palette.paper;
  context.fillRect(0, 0, width, height);
  if (photos.length > 1) {
    context.fillStyle = palette.cream;
    context.fillRect(0, 0, width, height);
    drawPhotoMosaic(context, photos, side, height * .12, width - side - Math.max(side, safe.right), height * .63, 22);
    context.fillStyle = palette.coral;
    context.font = "700 17px sans-serif";
    context.fillText(`CHAPTER ${String(index).padStart(2, "0")}  ·  ${photos.length} MOMENTS`, side, height * .79);
    title(context, chapter?.title ?? photoTitle(options.story, lead), side, height * .82, width - side * 2, palette.ink, 48, 2);
    brand(context, width, height, palette.ink, options.profile);
    slideNumber(context, options, index, total);
    return;
  }
  if (variant === 0) {
    clippedPhoto(context, lead, 48, 48, width - 96, height * .68, 26, 1.02);
    context.fillStyle = palette.coral;
    context.font = "700 17px sans-serif";
    context.fillText(chapter?.beat.toUpperCase().replace("-", " ") ?? `MOMENT ${String(index).padStart(2, "0")}`, side, height * .735);
    title(context, photoTitle(options.story, lead), side, height * .77, width - side * 2, palette.ink, 52, 2);
  } else if (variant === 1) {
    context.fillStyle = palette.coral;
    context.font = "700 17px sans-serif";
    context.fillText(`CHAPTER ${String(index).padStart(2, "0")}`, side, height * .105);
    const titleLines = title(context, photoTitle(options.story, lead), side, height * .14, width - side * 2, palette.ink, 58, 2);
    context.fillStyle = "#71685e";
    context.font = "500 18px sans-serif";
    wrapText(context, chapterNarration(options.story, lead?.moment.id), side, height * .14 + titleLines * 54 + 16, width - side * 2, 26, 2);
    clippedPhoto(context, lead, side, height * .35, width - side * 2, height * .52, 22, 1.02);
  } else {
    clippedPhoto(context, lead, 0, 0, width, height, 0, options.profile.cropScale);
    const shade = context.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, "rgba(10,24,18,.12)");
    shade.addColorStop(.55, "rgba(10,24,18,.02)");
    shade.addColorStop(1, "rgba(10,24,18,.5)");
    context.fillStyle = shade;
    context.fillRect(0, 0, width, height);
    const cardX = side;
    const cardY = height * .61;
    const cardWidth = width - side - Math.max(54, safe.right);
    const cardHeight = Math.min(height * .265, height - cardY - Math.max(90, safe.bottom));
    fillRounded(context, "rgba(255,248,236,.94)", cardX, cardY, cardWidth, cardHeight, 28);
    fillRounded(context, palette.coral, cardX + 26, cardY + 27, 184, 36, 18);
    context.fillStyle = palette.cream;
    context.font = "700 14px sans-serif";
    context.textBaseline = "middle";
    context.fillText(chapter?.beat.toUpperCase().replace("-", " ") ?? "THE JOURNEY", cardX + 44, cardY + 45);
    context.textBaseline = "alphabetic";
    const titleLines = title(context, photoTitle(options.story, lead), cardX + 28, cardY + 82, cardWidth - 56, palette.ink, 54, 2);
    context.fillStyle = "#655f56";
    context.font = "500 18px sans-serif";
    wrapText(context, chapterNarration(options.story, lead?.moment.id), cardX + 28, cardY + 90 + titleLines * 50, cardWidth - 56, 25, 2);
  }
  brand(context, width, height, variant === 2 ? palette.cream : palette.ink, options.profile);
  storyRail(context, options, index, total, variant === 2 ? palette.gold : palette.coral);
  slideNumber(context, options, index, total, variant === 2);
}

function drawScrapbookCarouselMoment(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], index: number, total: number) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  context.fillStyle = "#e7dbc8";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(74,93,79,.12)";
  for (let x = 0; x < width; x += 38) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y < height; y += 38) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  const side = Math.max(54, safe.left);
  context.save();
  context.translate(width / 2, height * .43);
  context.rotate((((index % 2) ? 2.4 : -2.4) * Math.PI) / 180);
  context.shadowColor = "rgba(48,39,27,.25)";
  context.shadowBlur = 32;
  fillRounded(context, palette.cream, -width * .41, -height * .32, width * .82, height * .64, 8);
  drawPhotoMosaic(context, photos, -width * .38, -height * .295, width * .76, height * .49, 3);
  context.fillStyle = palette.ink;
  context.font = "700 26px Georgia, serif";
  wrapText(context, photoTitle(options.story, photos[0]), -width * .36, height * .225, width * .7, 29, 2);
  context.restore();
  fillRounded(context, "rgba(200,108,87,.18)", side, height * .78, width - side * 2, height * .105, 4);
  context.fillStyle = palette.coral;
  context.font = "700 16px sans-serif";
  context.fillText(`NOTE ${String(index).padStart(2, "0")}  ·  ${photos.length > 1 ? `${photos.length} MOMENTS` : "FROM THE JOURNEY"}`, side + 22, height * .815);
  context.fillStyle = "#5d574e";
  context.font = "500 18px sans-serif";
  wrapText(context, chapterNarration(options.story, photos[0]?.moment.id), side + 22, height * .846, width - side * 2 - 44, 25, 2);
  brand(context, width, height, palette.ink, options.profile);
  storyRail(context, options, index, total, palette.coral);
  slideNumber(context, options, index, total);
}

function drawCinematicCarouselMoment(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], index: number, total: number) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  if (photos.length > 1) drawPhotoMosaic(context, photos, 0, 0, width, height, 0);
  else if (photos[0]) cover(context, photos[0].image, 0, 0, width, height, options.profile.cropScale);
  else { context.fillStyle = palette.ink; context.fillRect(0, 0, width, height); }
  const shade = context.createLinearGradient(0, height * .3, 0, height);
  shade.addColorStop(0, "rgba(7,18,12,.04)");
  shade.addColorStop(1, "rgba(7,18,12,.96)");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const side = Math.max(54, safe.left);
  context.fillStyle = palette.gold;
  context.font = "700 17px sans-serif";
  context.fillText(`SCENE ${String(index).padStart(2, "0")}  ·  ${photos.length > 1 ? `${photos.length} MOMENTS` : "A SHARED STORY"}`, side, height * .68);
  const titleLines = title(context, photoTitle(options.story, photos[0]), side, height * .72, width - side - Math.max(54, safe.right), palette.cream, 62, 2);
  context.fillStyle = "rgba(255,248,236,.8)";
  context.font = "500 19px sans-serif";
  wrapText(context, chapterNarration(options.story, photos[0]?.moment.id), side, height * .72 + titleLines * 57 + 20, width - side * 2, 27, 2);
  brand(context, width, height, palette.cream, options.profile);
  storyRail(context, options, index, total, palette.gold);
  slideNumber(context, options, index, total, true);
}

function drawCarouselClosing(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], index: number, total: number) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  const side = Math.max(58, safe.left);
  context.fillStyle = options.story.style === "cinematic" ? "#14271f" : palette.paper;
  context.fillRect(0, 0, width, height);
  if (photos.length) drawPhotoMosaic(context, photos, side, height * .08, width - side * 2, height * .3, 18);
  context.fillStyle = palette.coral;
  context.font = "700 17px sans-serif";
  context.fillText("WHAT STAYED WITH US", side, height * .48);
  const light = options.story.style === "cinematic";
  const titleLines = title(context, "Some journeys end. The story keeps moving.", side, height * .525, width - side * 2, light ? palette.cream : palette.ink, 58, 3);
  context.fillStyle = light ? "rgba(255,248,236,.76)" : "#655f56";
  context.font = "500 20px sans-serif";
  wrapText(context, storyClosing(options.story), side, height * .525 + titleLines * 54 + 28, width - side * 2, 29, 4);
  brand(context, width, height, light ? palette.cream : palette.ink, options.profile);
  storyRail(context, options, index, total, light ? palette.gold : palette.coral);
  slideNumber(context, options, index, total, light);
}

function drawCarouselSlide(context: CanvasRenderingContext2D, options: SocialExportOptions, allPhotos: LoadedPhoto[], slide: CarouselPlanSlide, index: number, total: number) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  const photos = slide.photoIndexes.map((photoIndex) => allPhotos[photoIndex]).filter((photo): photo is LoadedPhoto => Boolean(photo));
  if (slide.kind === "cover") drawCarouselCover(context, options, photos[0], index, total);
  else if (slide.kind === "closing") drawCarouselClosing(context, options, photos, index, total);
  else if (options.story.style === "scrapbook") drawScrapbookCarouselMoment(context, options, photos, index, total);
  else if (options.story.style === "cinematic") drawCinematicCarouselMoment(context, options, photos, index, total);
  else drawClassicCarouselMoment(context, options, photos, index, total);
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
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image could not be rendered")), "image/jpeg", 0.9));
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

export async function generateSocialExport(options: SocialExportOptions): Promise<Blob[]> {
  await document.fonts.ready;
  options.onProgress?.(0.04);
  const photos = await loadPhotos(options.moments, options.format === "image" ? 30 : options.profile.maxPhotos, options.onProgress);
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
      const slides = buildCarouselPlan(photos.length, options.profile.maxSlides ?? 10);
      const blobs: Blob[] = [];
      for (const [index, slide] of slides.entries()) {
        drawCarouselSlide(renderContext, options, photos, slide, index, slides.length);
        paintOutput(renderCanvas, outputCanvas, outputContext);
        blobs.push(await canvasBlob(outputCanvas));
        options.onProgress?.(0.3 + ((index + 1) / slides.length) * 0.6);
      }
      return blobs;
    }
    return [await recordVideo(renderCanvas, renderContext, outputCanvas, outputContext, options, photos)];
  } finally {
    photos.forEach((photo) => photo.release());
  }
}
