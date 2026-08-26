import { api } from "@zo-moments/sdk";
import type { DirectorPlan, MomentObject, Story, StoryStyle } from "@zo-moments/types";

export type SocialExportFormat = "image" | "video";

export function isShareCancellation(cause: unknown) {
  return cause instanceof DOMException && cause.name === "AbortError";
}

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
  heroMomentId?: string | undefined;
  directorPlan?: DirectorPlan | undefined;
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

export interface MotionPlanShot {
  kind: "opening" | "moment" | "closing";
  photoIndexes: number[];
  start: number;
  end: number;
  camera: "push-in" | "pan-left" | "pan-right" | "pull-back";
  transitionIn: "cut" | "dissolve" | "dip-to-ink";
  purpose: "recognition" | "journey" | "build" | "payoff" | "resolution";
}

export interface MotionPlanCheck {
  id: "coverage" | "arc" | "camera" | "payoff";
  label: string;
  detail: string;
  status: "pass" | "warn";
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

function cover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, scale = 1, offsetX = 0, offsetY = 0) {
  const ratio = Math.max(width / image.naturalWidth, height / image.naturalHeight) * scale;
  const sourceWidth = width / ratio;
  const sourceHeight = height / ratio;
  const sourceX = Math.max(0, (image.naturalWidth - sourceWidth) / 2 + offsetX);
  const sourceY = Math.max(0, (image.naturalHeight - sourceHeight) / 2 + offsetY);
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
function storySignature(story: Story, moments: MomentObject[]) {
  const people = new Set(moments.map((moment) => moment.uploadedBy)).size;
  const parts = [`${moments.length} ${moments.length === 1 ? "moment" : "moments"}`, `${people} ${people === 1 ? "person" : "people"}`];
  const place = story.canvas?.location ?? story.location;
  if (place) parts.push(place);
  return parts.join("  ·  ");
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
  context.globalAlpha = .84;
  context.fillStyle = colour;
  context.font = "700 14px Georgia, serif";
  context.fillText("ZO MOMENTS", side, baseline);
  context.globalAlpha = 0.48;
  context.font = "600 12px sans-serif";
  context.textAlign = "right";
  context.fillText("PRIVATE PHOTO STORY", width - Math.max(54, safe.right), baseline - 1);
  context.restore();
}

function title(context: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, colour: string, size: number, maxLines = 3) {
  context.fillStyle = colour;
  context.font = `700 ${size}px Fraunces, Georgia, serif`;
  context.textBaseline = "top";
  return wrapText(context, value, x, y, width, size * 0.92, maxLines);
}

function motionMetadata(context: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, colour: string) {
  if (!value) return;
  context.save();
  context.fillStyle = colour;
  context.font = "700 14px sans-serif";
  context.textBaseline = "top";
  wrapText(context, value, x, y, width, 20, 2);
  context.restore();
}

function motionProgress(context: CanvasRenderingContext2D, profile: SocialExportProfile, progress: number, scene: number, total: number, colour: string) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, profile);
  const left = Math.max(40, safe.left);
  const right = width - Math.max(40, safe.right);
  const y = Math.max(32, safe.top * .53);
  context.save();
  context.lineCap = "round";
  context.strokeStyle = "rgba(255,255,255,.38)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(left, y);
  context.lineTo(right, y);
  context.stroke();
  context.strokeStyle = colour;
  context.beginPath();
  context.moveTo(left, y);
  context.lineTo(left + (right - left) * progress, y);
  context.stroke();
  context.fillStyle = palette.cream;
  context.shadowColor = "rgba(8,20,14,.6)";
  context.shadowBlur = 7;
  context.font = "700 12px sans-serif";
  context.textBaseline = "top";
  context.fillText(`${String(scene).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, left, y + 14);
  context.restore();
}

function drawClassic(context: CanvasRenderingContext2D, story: Story, moments: MomentObject[], photos: LoadedPhoto[], progress: number, showLocation: boolean, showDate: boolean, profile: SocialExportProfile) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, profile);
  const side = Math.max(48, safe.left);
  const total = Math.max(photos.length, 1);
  const exactIndex = progress * total;
  const index = Math.min(total - 1, Math.floor(exactIndex));
  const localProgress = exactIndex - Math.floor(exactIndex);
  const photo = photos[index];
  const nextPhoto = photos[(index + 1) % total];
  context.fillStyle = palette.ink;
  context.fillRect(0, 0, width, height);
  if (photo) cover(context, photo.image, 0, 0, width, height, profile.cropScale + localProgress * .055, (localProgress - .5) * 16);
  if (nextPhoto && nextPhoto !== photo && localProgress > .84) {
    const blend = (localProgress - .84) / .16;
    context.save();
    context.globalAlpha = blend * blend * (3 - 2 * blend);
    cover(context, nextPhoto.image, 0, 0, width, height, profile.cropScale, -8);
    context.restore();
  }
  const wash = context.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, "rgba(8,20,14,.25)");
  wash.addColorStop(.45, "rgba(8,20,14,.02)");
  wash.addColorStop(1, "rgba(8,20,14,.78)");
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);

  const cardBottom = height - Math.max(84, safe.bottom + 32);
  const cardHeight = Math.min(220, height * .2);
  const cardTop = cardBottom - cardHeight;
  const cardWidth = width - side - Math.max(48, safe.right);
  context.shadowColor = "rgba(8,20,14,.28)";
  context.shadowBlur = 22;
  fillRounded(context, "rgba(255,248,236,.91)", side, cardTop, cardWidth, cardHeight, 22);
  context.shadowBlur = 0;
  fillRounded(context, palette.coral, side + 24, cardTop + 22, 4, 24, 2);
  context.fillStyle = palette.coral;
  context.font = "700 13px sans-serif";
  context.textBaseline = "top";
  context.fillText(`SCENE ${String(index + 1).padStart(2, "0")}`, side + 40, cardTop + 25);
  const contentWidth = cardWidth - 48;
  const headingSize = Math.min(36, width * .052);
  const titleTop = cardTop + 58;
  const titleLines = title(context, chapterForMoment(story, photo?.moment.id)?.title ?? story.title, side + 24, titleTop, contentWidth, palette.ink, headingSize, 2);
  context.fillStyle = "#6f675d";
  context.font = "500 15px sans-serif";
  const narrationTop = titleTop + titleLines * headingSize * .92 + 12;
  wrapText(context, chapterNarration(story, photo?.moment.id), side + 24, narrationTop, contentWidth, 21, 2);
  context.strokeStyle = "rgba(111,103,93,.24)";
  context.beginPath();
  context.moveTo(side + 24, cardBottom - 38);
  context.lineTo(side + cardWidth - 24, cardBottom - 38);
  context.stroke();
  context.font = "700 12px sans-serif";
  context.fillStyle = "#6f675d";
  context.textBaseline = "top";
  wrapText(context, metadata(story, moments, showLocation, showDate), side + 24, cardBottom - 28, contentWidth, 16, 1);
  motionProgress(context, profile, progress, index + 1, total, palette.gold);
  brand(context, width, height, palette.cream, profile);
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
    { x: width * 0.08, y: height * 0.1, w: width * 0.58, h: height * 0.36, angle: -5 },
    { x: width * 0.43, y: height * 0.32, w: width * 0.48, h: height * 0.29, angle: 6 },
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
  const side = Math.max(48, safe.left);
  const noteBottom = height - Math.max(84, safe.bottom + 32);
  const noteHeight = Math.min(310, height * .25);
  const noteTop = noteBottom - noteHeight;
  const noteWidth = width - side - Math.max(48, safe.right);
  const notePadding = 28;
  fillRounded(context, "rgba(255,248,236,.94)", side, noteTop, noteWidth, noteHeight, 12);
  fillRounded(context, "rgba(200,108,87,.18)", side + notePadding, noteTop + 24, 184, 32, 4);
  context.fillStyle = palette.coral;
  context.font = "700 14px sans-serif";
  context.textBaseline = "middle";
  context.fillText(`FIELD NOTE  ·  ${String(index + 1).padStart(2, "0")}`, side + notePadding + 14, noteTop + 40);
  const contentWidth = noteWidth - notePadding * 2;
  const titleTop = noteTop + 72;
  const titleLines = title(context, chapterForMoment(story, photos[index]?.moment.id)?.title ?? story.title, side + notePadding, titleTop, contentWidth, palette.coral, 44, 2);
  context.fillStyle = "#5f594f";
  context.font = "500 17px sans-serif";
  const narrationTop = titleTop + titleLines * 40.5 + 20;
  wrapText(context, chapterNarration(story, photos[index]?.moment.id), side + notePadding, narrationTop, contentWidth, 26, 3);
  context.strokeStyle = "rgba(112,103,92,.24)";
  context.beginPath();
  context.moveTo(side + notePadding, noteBottom - 58);
  context.lineTo(side + noteWidth - notePadding, noteBottom - 58);
  context.stroke();
  motionMetadata(context, metadata(story, moments, showLocation, showDate), side + notePadding, noteBottom - 43, contentWidth, "#70675c");
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
  const contentBottom = height - Math.max(84, safe.bottom + 32);
  const titleTop = Math.min(height * .64, contentBottom - 300);
  context.fillText(`SCENE ${String(index + 1).padStart(2, "0")}  ·  A SHARED STORY`, side, titleTop - 46);
  const titleLines = title(context, chapterForMoment(story, photos[index]?.moment.id)?.title ?? story.title, side, titleTop, width - side - Math.max(54, safe.right), palette.cream, 58, 2);
  context.fillStyle = "#e8ddcd";
  context.font = "500 19px sans-serif";
  wrapText(context, chapterNarration(story, photos[index]?.moment.id), side, titleTop + titleLines * 54 + 26, width - side - Math.max(54, safe.right), 29, 3);
  context.strokeStyle = "rgba(255,248,236,.28)";
  context.beginPath();
  context.moveTo(side, contentBottom - 62);
  context.lineTo(width - Math.max(54, safe.right), contentBottom - 62);
  context.stroke();
  motionMetadata(context, metadata(story, moments, showLocation, showDate), side, contentBottom - 45, width - side - Math.max(54, safe.right), "#e8ddcd");
  brand(context, width, height, palette.cream, profile);
}

function easeInOut(value: number) {
  return value < .5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2;
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * A deterministic director's plan. The same arc drives camera movement, cut energy,
 * the visual payoff and the generated soundtrack so an export reads as one film.
 */
export function buildMotionPlan(photoCount: number, requestedHeroPhotoIndex?: number): MotionPlanShot[] {
  const count = Math.max(1, photoCount);
  const shots: Array<Omit<MotionPlanShot, "start" | "end"> & { duration: number }> = [
    { kind: "opening", photoIndexes: [0], duration: .15, camera: "push-in", transitionIn: "cut", purpose: "recognition" },
  ];
  const defaultPayoffIndex = count === 1 ? 0 : Math.min(count - 1, Math.max(1, Math.round((count - 1) * .62)));
  const payoffIndex = requestedHeroPhotoIndex === undefined ? defaultPayoffIndex : Math.min(count - 1, Math.max(0, requestedHeroPhotoIndex));
  const weights = Array.from({ length: count }, (_, index) => {
    if (index === payoffIndex) return 1.8;
    if (index === count - 1) return .9;
    if (index < payoffIndex) return .95 + index * .08;
    return 1.08;
  });
  const availableDuration = .68;
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < count; index += 1) {
    const purpose = index === payoffIndex ? "payoff" : index === count - 1 ? "resolution" : index === 0 ? "journey" : index < payoffIndex ? "build" : "journey";
    shots.push({
      kind: "moment",
      photoIndexes: [index],
      duration: availableDuration * (weights[index] ?? 1) / weightTotal,
      camera: purpose === "payoff" ? "push-in" : ["pan-left", "pull-back", "pan-right", "push-in"][index % 4] as MotionPlanShot["camera"],
      transitionIn: purpose === "payoff" ? "dip-to-ink" : purpose === "build" ? "cut" : "dissolve",
      purpose,
    });
  }
  shots.push({ kind: "closing", photoIndexes: Array.from({ length: Math.min(3, count) }, (_, index) => Math.max(0, count - 3 + index)), duration: .17, camera: "pull-back", transitionIn: "dissolve", purpose: "resolution" });
  let cursor = 0;
  return shots.map(({ duration, ...shot }) => {
    const start = cursor;
    cursor += duration;
    return { ...shot, start, end: cursor };
  });
}

/**
 * A deterministic preflight. It checks plan properties we can prove before
 * rendering rather than making an ungrounded claim about the finished video.
 */
export function assessMotionPlan(plan: MotionPlanShot[], photoCount: number): MotionPlanCheck[] {
  const sourceShots = plan.filter((shot) => shot.kind === "moment");
  const used = new Set(sourceShots.flatMap((shot) => shot.photoIndexes));
  const cameraChanges = sourceShots.slice(1).filter((shot, index) => shot.camera !== sourceShots[index]?.camera).length;
  const payoff = plan.find((shot) => shot.purpose === "payoff");
  const journey = plan.find((shot) => shot.purpose === "journey");
  return [
    { id: "coverage", label: "Every selected photo has a scene", detail: `${used.size} of ${Math.max(1, photoCount)} source photos are assigned.`, status: used.size >= Math.max(1, photoCount) ? "pass" : "warn" },
    { id: "arc", label: "The story has a beginning, build and closing", detail: `${plan.length} timed scenes follow one shared arc.`, status: plan[0]?.kind === "opening" && plan.at(-1)?.kind === "closing" && Boolean(journey) ? "pass" : "warn" },
    { id: "camera", label: "Camera moves vary by scene", detail: `${new Set(sourceShots.map((shot) => shot.camera)).size} camera treatments with ${cameraChanges} deliberate changes.`, status: new Set(sourceShots.map((shot) => shot.camera)).size >= Math.min(2, sourceShots.length) ? "pass" : "warn" },
    { id: "payoff", label: "One chosen image receives the payoff", detail: payoff ? `Scene ${plan.indexOf(payoff) + 1} gets the longest hold, gold bloom and an impact cue.` : "Choose a hero image to set the payoff.", status: payoff ? "pass" : "warn" },
  ];
}

function hydrateDirectorPlan(plan: DirectorPlan, photos: LoadedPhoto[]): MotionPlanShot[] | null {
  const photoIndexes = new Map(photos.map((photo, index) => [photo.moment.id, index]));
  const hydrated = plan.shots.map((shot) => {
    const photoIndex = shot.momentId ? photoIndexes.get(shot.momentId) : undefined;
    if (shot.kind !== "closing" && photoIndex === undefined) return null;
    return {
      kind: shot.kind,
      photoIndexes: shot.kind === "closing" ? Array.from({ length: Math.min(3, photos.length) }, (_, index) => Math.max(0, photos.length - 3 + index)) : [photoIndex!],
      start: shot.start,
      end: shot.end,
      camera: shot.camera,
      transitionIn: shot.transitionIn,
      purpose: shot.purpose,
    } satisfies MotionPlanShot;
  });
  return hydrated.some((shot) => !shot) ? null : hydrated as MotionPlanShot[];
}

function motionCamera(shot: MotionPlanShot, progress: number) {
  const eased = easeInOut(progress);
  switch (shot.camera) {
    case "pan-left": return { scale: 1.1, offsetX: 24 - eased * 48, offsetY: -8 + eased * 16 };
    case "pan-right": return { scale: 1.1, offsetX: -24 + eased * 48, offsetY: 8 - eased * 16 };
    case "pull-back": return { scale: 1.14 - eased * .1, offsetX: 0, offsetY: 10 - eased * 18 };
    default: return { scale: 1.03 + eased * .1, offsetX: -8 + eased * 16, offsetY: 7 - eased * 14 };
  }
}

function storyHeadingSize(value: string, preferred: number, minimum: number) {
  if (value.length <= 30) return preferred;
  if (value.length <= 52) return Math.max(minimum, preferred - 8);
  return minimum;
}

function drawMotionCaption(
  context: CanvasRenderingContext2D,
  options: SocialExportOptions,
  heading: string,
  body: string,
  label: string,
  emphasis: "normal" | "payoff" = "normal",
) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  const side = Math.max(54, safe.left);
  const right = Math.max(54, safe.right);
  const contentWidth = width - side - right;
  const titleTop = Math.min(height * .675, height - Math.max(250, safe.bottom + 230));
  const size = storyHeadingSize(heading, emphasis === "payoff" ? 62 : 54, 42);
  context.save();
  context.fillStyle = emphasis === "payoff" ? palette.gold : "rgba(255,248,236,.76)";
  context.font = "700 13px sans-serif";
  context.letterSpacing = "1.6px";
  context.fillText(label.toUpperCase(), side, titleTop - 30);
  context.letterSpacing = "0px";
  const lines = title(context, heading, side, titleTop, contentWidth, palette.cream, size, 2);
  context.fillStyle = "rgba(255,248,236,.78)";
  context.font = "500 18px sans-serif";
  wrapText(context, body, side, titleTop + lines * size * .9 + 18, contentWidth, 25, 2);
  context.restore();
}

function drawMotionShot(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], shot: MotionPlanShot, localProgress: number, index: number, total: number) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  const side = Math.max(54, safe.left);
  const firstPhotoIndex = shot.photoIndexes[0];
  const photo = firstPhotoIndex === undefined ? undefined : photos[firstPhotoIndex];
  const camera = motionCamera(shot, localProgress);
  context.fillStyle = palette.ink;
  context.fillRect(0, 0, width, height);

  if (shot.kind === "closing") {
    const mosaic = shot.photoIndexes.map((photoIndex) => photos[photoIndex]).filter((item): item is LoadedPhoto => Boolean(item));
    if (mosaic.length) drawPhotoMosaic(context, mosaic, side, height * .105, width - side * 2, height * .32, 22);
    const glow = context.createRadialGradient(width * .5, height * .74, 0, width * .5, height * .74, width * .7);
    glow.addColorStop(0, "rgba(239,196,111,.15)");
    glow.addColorStop(1, "rgba(20,39,31,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.fillStyle = palette.gold;
    context.font = "700 14px sans-serif";
    context.letterSpacing = "1.6px";
    context.fillText("THE LAST FRAME", side, height * .54);
    context.letterSpacing = "0px";
    const closingLines = title(context, options.story.canvas?.title ?? options.story.title, side, height * .58, width - side * 2, palette.cream, storyHeadingSize(options.story.canvas?.title ?? options.story.title, 58, 44), 2);
    context.fillStyle = "rgba(255,248,236,.76)";
    context.font = "500 20px sans-serif";
    wrapText(context, storyClosing(options.story), side, height * .58 + closingLines * 54 + 28, width - side * 2, 29, 3);
    context.fillStyle = palette.gold;
    context.font = "700 17px sans-serif";
    context.fillText(storySignature(options.story, options.moments).toUpperCase(), side, height - Math.max(112, safe.bottom + 66));
    motionProgress(context, options.profile, .995, index + 1, total, palette.gold);
    brand(context, width, height, palette.cream, options.profile);
    return;
  }

  if (photo) cover(context, photo.image, 0, 0, width, height, camera.scale * options.profile.cropScale, camera.offsetX, camera.offsetY);
  const shade = context.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0, shot.kind === "opening" ? "rgba(7,18,12,.26)" : "rgba(7,18,12,.15)");
  shade.addColorStop(.5, "rgba(7,18,12,.05)");
  shade.addColorStop(1, "rgba(7,18,12,.92)");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);

  if (shot.purpose === "payoff") {
    const flare = context.createRadialGradient(width * .5, height * .42, 0, width * .5, height * .42, width * .68);
    flare.addColorStop(0, `rgba(239,196,111,${.2 * Math.sin(localProgress * Math.PI)})`);
    flare.addColorStop(1, "rgba(239,196,111,0)");
    context.fillStyle = flare;
    context.fillRect(0, 0, width, height);
  }

  if (shot.kind === "opening") {
    const intro = easeInOut(clamp(localProgress / .5));
    context.save();
    context.globalAlpha = intro;
    context.fillStyle = palette.gold;
    context.font = "700 13px sans-serif";
    context.letterSpacing = "1.6px";
    context.fillText(metadata(options.story, options.moments, options.includeLocation, options.includeDate).toUpperCase() || "A PRIVATE PHOTO STORY", side, Math.max(72, safe.top + 32));
    context.letterSpacing = "0px";
    const heading = options.story.canvas?.title ?? options.story.title;
    const headingSize = storyHeadingSize(heading, 72, 48);
    const titleTop = Math.min(height * .54, height - safe.bottom - 420);
    const lines = title(context, heading, side, titleTop, width - side * 2, palette.cream, headingSize, 3);
    context.fillStyle = "rgba(255,248,236,.83)";
    context.font = "500 21px sans-serif";
    wrapText(context, storyOpening(options.story), side, titleTop + lines * headingSize * .92 + 28, width - side * 2, 30, 2);
    context.restore();
  } else {
    const chapter = chapterForMoment(options.story, photo?.moment.id);
    const sceneLabel = shot.purpose === "payoff" ? "The moment it landed" : chapter?.beat.replace("-", " ") ?? "From the journey";
    drawMotionCaption(context, options, chapter?.title ?? photoTitle(options.story, photo), chapterNarration(options.story, photo?.moment.id), sceneLabel, shot.purpose === "payoff" ? "payoff" : "normal");
  }
  motionProgress(context, options.profile, clamp((localProgress + index) / total), index + 1, total, palette.gold);
  brand(context, width, height, palette.cream, options.profile);
}

function drawMotionFrame(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], plan: MotionPlanShot[], progress: number) {
  const position = clamp(progress);
  const index = Math.min(plan.length - 1, plan.findIndex((shot) => position < shot.end));
  const shot = plan[index]!;
  const localProgress = clamp((position - shot.start) / (shot.end - shot.start));
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  const nextShot = plan[index + 1];
  const transition = nextShot?.transitionIn ?? "cut";
  const transitionStart = transition === "cut" ? 1 : transition === "dip-to-ink" ? .78 : .86;
  if (index < plan.length - 1 && localProgress > transitionStart) {
    const blend = easeInOut((localProgress - transitionStart) / (1 - transitionStart));
    if (transition === "dip-to-ink") {
      const ink = blend < .5 ? blend * 2 : (1 - blend) * 2;
      drawMotionShot(context, options, photos, blend < .5 ? shot : plan[index + 1]!, blend < .5 ? localProgress : 0, blend < .5 ? index : index + 1, plan.length);
      context.save();
      context.globalAlpha = ink;
      context.fillStyle = palette.ink;
      context.fillRect(0, 0, context.canvas.width, context.canvas.height);
      context.restore();
      return;
    }
    context.save();
    context.globalAlpha = 1 - blend;
    drawMotionShot(context, options, photos, shot, localProgress, index, plan.length);
    context.restore();
    context.save();
    context.globalAlpha = blend;
    drawMotionShot(context, options, photos, plan[index + 1]!, 0, index + 1, plan.length);
    context.restore();
    return;
  }
  drawMotionShot(context, options, photos, shot, localProgress, index, plan.length);
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

function photoCaption(photo: LoadedPhoto) {
  return photo.moment.caption?.trim() ?? photo.moment.name.replace(/\.[^.]+$/, "");
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

function drawScrapbookPrint(context: CanvasRenderingContext2D, photo: LoadedPhoto | undefined, x: number, y: number, width: number, height: number, angle: number, caption: string, compact = false) {
  const border = compact ? 16 : 22;
  const captionHeight = compact ? 68 : 96;
  context.save();
  context.translate(x + width / 2, y + height / 2);
  context.rotate((angle * Math.PI) / 180);
  context.shadowColor = "rgba(48,39,27,.28)";
  context.shadowBlur = compact ? 22 : 38;
  context.shadowOffsetY = compact ? 10 : 16;
  fillRounded(context, palette.cream, -width / 2, -height / 2, width, height, compact ? 6 : 10);
  context.shadowColor = "transparent";
  clippedPhoto(context, photo, -width / 2 + border, -height / 2 + border, width - border * 2, height - captionHeight - border, compact ? 3 : 5, 1.025);
  context.fillStyle = palette.ink;
  context.font = compact ? "700 18px Georgia, serif" : "700 34px Georgia, serif";
  context.textBaseline = "top";
  wrapText(context, caption, -width / 2 + border, height / 2 - captionHeight + (compact ? 17 : 22), width - border * 2, compact ? 21 : 37, 2);
  context.restore();
}

function drawTape(context: CanvasRenderingContext2D, x: number, y: number, width: number, angle: number) {
  context.save();
  context.translate(x + width / 2, y + 13);
  context.rotate((angle * Math.PI) / 180);
  fillRounded(context, "rgba(239,196,111,.72)", -width / 2, -13, width, 26, 3);
  context.restore();
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
  const meta = metadata(options.story, options.moments, options.includeLocation, options.includeDate);
  context.fillStyle = "rgba(255,248,236,.14)";
  fillRounded(context, "rgba(255,248,236,.14)", side, Math.max(46, safe.top + 18), Math.min(width - side * 2, Math.max(210, context.measureText(meta || "PRIVATE PHOTO STORY").width + 54)), 40, 20);
  context.fillStyle = palette.gold;
  context.font = "700 13px sans-serif";
  context.letterSpacing = "1.4px";
  context.fillText(meta.toUpperCase() || "PRIVATE PHOTO STORY", side + 20, Math.max(72, safe.top + 44));
  context.letterSpacing = "0px";
  const heading = options.story.canvas?.title ?? options.story.title;
  const headingSize = storyHeadingSize(heading, 74, 48);
  const titleTop = Math.min(height * .56, height - safe.bottom - 360);
  const titleLines = title(context, heading, side, titleTop, width - side - Math.max(58, safe.right), palette.cream, headingSize, 3);
  context.fillStyle = "rgba(255,248,236,.86)";
  context.font = "500 19px sans-serif";
  wrapText(context, storyOpening(options.story), side, titleTop + titleLines * headingSize * .92 + 25, width - side - Math.max(70, safe.right), 28, 2);
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

function drawScrapbookCarouselMoment(context: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[], relatedPhoto: LoadedPhoto | undefined, index: number, total: number) {
  const { width, height } = context.canvas;
  const safe = safeArea(width, height, options.profile);
  context.fillStyle = "#e7dbc8";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(74,93,79,.1)";
  for (let x = 0; x < width; x += 54) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y < height; y += 54) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  const side = Math.max(54, safe.left);
  const variant = (index - 1) % 3;
  const lead = photos[0];
  const secondary = photos[1] ?? relatedPhoto;
  const chapter = chapterForMoment(options.story, lead?.moment.id);
  context.save();
  context.globalAlpha = .075;
  context.fillStyle = palette.ink;
  context.font = "italic 700 190px Georgia, serif";
  context.textAlign = "right";
  context.textBaseline = "top";
  context.fillText(String(index).padStart(2, "0"), width - side, height * .085);
  context.restore();

  fillRounded(context, "rgba(200,108,87,.16)", side, height * .092, 250, 38, 19);
  context.fillStyle = palette.coral;
  context.font = "700 16px sans-serif";
  context.textBaseline = "middle";
  context.fillText(`${chapter?.beat.toUpperCase().replace("-", " ") ?? "TRAVEL NOTE"}  ·  ${String(index).padStart(2, "0")}`, side + 20, height * .092 + 19);

  const main = variant === 0
    ? { x: side + 6, y: height * .15, width: width * .69, height: height * .515, angle: -2.6 }
    : variant === 1
      ? { x: width * .27, y: height * .15, width: width * .67, height: height * .515, angle: 2.4 }
      : { x: side + 16, y: height * .145, width: width - side * 2 - 32, height: height * .495, angle: -1.2 };
  drawScrapbookPrint(context, lead, main.x, main.y, main.width, main.height, main.angle, photoTitle(options.story, lead));
  drawTape(context, main.x + main.width * .31, main.y - 4, main.width * .32, -main.angle * .7);

  if (secondary && secondary !== lead) {
    const inset = variant === 0
      ? { x: width * .69, y: height * .36, angle: 5.8 }
      : variant === 1
        ? { x: width * .045, y: height * .37, angle: -6.2 }
        : { x: width * .68, y: height * .37, angle: 5.2 };
    const insetWidth = width * .255;
    const insetHeight = height * .205;
    drawScrapbookPrint(context, secondary, inset.x, inset.y, insetWidth, insetHeight, inset.angle, photoCaption(secondary), true);
    drawTape(context, inset.x + insetWidth * .28, inset.y - 4, insetWidth * .44, -inset.angle * .55);
  }

  const noteTop = height * .735;
  const noteHeight = Math.min(230, height * .17);
  context.shadowColor = "rgba(48,39,27,.12)";
  context.shadowBlur = 20;
  fillRounded(context, "rgba(255,248,236,.94)", side, noteTop, width - side * 2, noteHeight, 18);
  context.shadowColor = "transparent";
  fillRounded(context, palette.coral, side, noteTop, 8, noteHeight, 4);
  context.fillStyle = palette.coral;
  context.font = "700 17px sans-serif";
  context.textBaseline = "top";
  context.fillText(`FIELD NOTE  ·  ${photos.length > 1 ? `${photos.length} MOMENTS` : "FROM THE JOURNEY"}`, side + 30, noteTop + 27);
  context.fillStyle = "#514e46";
  context.font = "500 24px sans-serif";
  wrapText(context, chapterNarration(options.story, lead?.moment.id), side + 30, noteTop + 66, width - side * 2 - 60, 33, 3);
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
  const shade = context.createLinearGradient(0, height * .22, 0, height);
  shade.addColorStop(0, "rgba(7,18,12,.04)");
  shade.addColorStop(.5, "rgba(7,18,12,.08)");
  shade.addColorStop(1, "rgba(7,18,12,.94)");
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const side = Math.max(54, safe.left);
  const chapter = chapterForMoment(options.story, photos[0]?.moment.id);
  const heading = chapter?.title ?? photoTitle(options.story, photos[0]);
  const headingSize = storyHeadingSize(heading, 58, 42);
  const titleTop = Math.min(height * .69, height - Math.max(240, safe.bottom + 205));
  context.fillStyle = palette.gold;
  context.font = "700 13px sans-serif";
  context.letterSpacing = "1.4px";
  context.fillText((chapter?.beat.replace("-", " ") ?? "FROM THE JOURNEY").toUpperCase(), side, titleTop - 28);
  context.letterSpacing = "0px";
  const titleLines = title(context, heading, side, titleTop, width - side - Math.max(54, safe.right), palette.cream, headingSize, 2);
  context.fillStyle = "rgba(255,248,236,.78)";
  context.font = "500 17px sans-serif";
  wrapText(context, chapterNarration(options.story, photos[0]?.moment.id), side, titleTop + titleLines * headingSize * .9 + 17, width - side * 2, 24, 2);
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
  const light = options.story.style === "cinematic";
  context.fillStyle = light ? palette.gold : palette.coral;
  context.font = "700 13px sans-serif";
  context.letterSpacing = "1.5px";
  context.fillText("THE LAST FRAME", side, height * .48);
  context.letterSpacing = "0px";
  const closingHeading = options.story.canvas?.title ?? options.story.title;
  const titleLines = title(context, closingHeading, side, height * .525, width - side * 2, light ? palette.cream : palette.ink, storyHeadingSize(closingHeading, 58, 42), 2);
  context.fillStyle = light ? "rgba(255,248,236,.76)" : "#655f56";
  context.font = "500 20px sans-serif";
  wrapText(context, storyClosing(options.story), side, height * .525 + titleLines * 54 + 28, width - side * 2, 29, 4);
  const signature = storySignature(options.story, options.moments);
  const signatureY = height - Math.max(96, safeArea(width, height, options.profile).bottom + 52);
  context.save();
  context.fillStyle = light ? palette.gold : palette.coral;
  context.font = "700 18px sans-serif";
  context.fillText(signature.toUpperCase(), side, signatureY);
  context.restore();
  brand(context, width, height, light ? palette.cream : palette.ink, options.profile);
  storyRail(context, options, index, total, light ? palette.gold : palette.coral);
  slideNumber(context, options, index, total, light);
}

function drawCarouselSlide(context: CanvasRenderingContext2D, options: SocialExportOptions, allPhotos: LoadedPhoto[], slide: CarouselPlanSlide, index: number, total: number) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  const photos = slide.photoIndexes.map((photoIndex) => allPhotos[photoIndex]).filter((photo): photo is LoadedPhoto => Boolean(photo));
  if (slide.kind === "cover") drawCarouselCover(context, options, photos[0], index, total);
  else if (slide.kind === "closing") drawCarouselClosing(context, options, photos, index, total);
  else if (options.story.style === "scrapbook") {
    const relatedIndex = slide.photoIndexes.length && allPhotos.length ? (slide.photoIndexes.at(-1)! + 1) % allPhotos.length : 0;
    drawScrapbookCarouselMoment(context, options, photos, allPhotos[relatedIndex], index, total);
  }
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
  const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

async function addAmbientSoundtrack(stream: MediaStream, plan: MotionPlanShot[], durationMs: number) {
  if (!window.AudioContext) return () => {};
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  const master = context.createGain();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  const tones = [164.81, 220, 246.94].map((frequency) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.018;
    oscillator.connect(gain).connect(master);
    return oscillator;
  });
  master.gain.value = 0.0001;
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.014;
  lfo.connect(lfoGain).connect(master.gain);
  master.connect(destination);
  try { await context.resume(); } catch { /* Exports remain usable without preview audio. */ }
  const start = context.currentTime;
  master.gain.exponentialRampToValueAtTime(0.06, start + 0.7);
  lfo.start(start);
  tones.forEach((tone) => tone.start(start));
  for (const shot of plan.filter((item) => item.purpose === "build" || item.purpose === "payoff")) {
    const accent = context.createOscillator();
    const accentGain = context.createGain();
    const at = start + durationMs / 1000 * shot.start;
    accent.type = shot.purpose === "payoff" ? "triangle" : "sine";
    accent.frequency.setValueAtTime(shot.purpose === "payoff" ? 440 : 329.63, at);
    accentGain.gain.setValueAtTime(0.0001, at);
    accentGain.gain.exponentialRampToValueAtTime(shot.purpose === "payoff" ? .07 : .035, at + .025);
    accentGain.gain.exponentialRampToValueAtTime(0.0001, at + (shot.purpose === "payoff" ? .46 : .22));
    accent.connect(accentGain).connect(master);
    accent.start(at);
    accent.stop(at + .55);
  }
  const audioTrack = destination.stream.getAudioTracks()[0];
  if (audioTrack) stream.addTrack(audioTrack);
  return () => {
    tones.forEach((tone) => tone.stop());
    lfo.stop();
    audioTrack?.stop();
    void context.close();
  };
}

function paintOutput(renderCanvas: HTMLCanvasElement, outputCanvas: HTMLCanvasElement, outputContext: CanvasRenderingContext2D) {
  outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputContext.drawImage(renderCanvas, 0, 0, outputCanvas.width, outputCanvas.height);
}

async function recordVideo(renderCanvas: HTMLCanvasElement, renderContext: CanvasRenderingContext2D, outputCanvas: HTMLCanvasElement, outputContext: CanvasRenderingContext2D, options: SocialExportOptions, photos: LoadedPhoto[]) {
  if (!("MediaRecorder" in window) || typeof outputCanvas.captureStream !== "function") throw new Error("Video creation is not supported in this browser. Try the image format instead.");
  const stream = outputCanvas.captureStream(30);
  const heroPhotoIndex = options.heroMomentId ? photos.findIndex((photo) => photo.moment.id === options.heroMomentId) : undefined;
  const plan = options.directorPlan ? hydrateDirectorPlan(options.directorPlan, photos) : null;
  const resolvedPlan = plan ?? buildMotionPlan(photos.length, heroPhotoIndex === -1 ? undefined : heroPhotoIndex);
  const stopSoundtrack = await addAmbientSoundtrack(stream, resolvedPlan, options.profile.durationMs);
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
  try {
    recorder.start(250);
    await new Promise<void>((resolve) => {
      const animate = (now: number) => {
        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        drawMotionFrame(renderContext, options, photos, resolvedPlan, progress === 1 ? 0.999 : progress);
        paintOutput(renderCanvas, outputCanvas, outputContext);
        options.onProgress?.(0.3 + progress * 0.55);
        if (progress < 1) requestAnimationFrame(animate);
        else resolve();
      };
      requestAnimationFrame(animate);
    });
    recorder.stop();
    return await result;
  } finally {
    stopSoundtrack();
    stream.getTracks().forEach((track) => track.stop());
  }
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
