import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Cloud, FileAudio, FileText, Film, History, ImagePlus, MapPin, PencilLine, Route, RotateCcw, Share2, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { MomentObject, Story, StoryBlueprint, StoryCanvas, StoryCanvasMoment, StoryRevision, StoryStyle, StoryStylePreference, StoryStyleSource } from "@zo-moments/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SocialShareDialog } from "./social-share-dialog";
import { Button, Field, Input, Modal, Spinner } from "./ui";

function storyMoments(story: Story, objects: MomentObject[]) {
  const byId = new Map(objects.map((object) => [object.id, object]));
  return story.momentIds.map((id) => byId.get(id)).filter((object): object is MomentObject => Boolean(object));
}

function storyDateRange(objects: MomentObject[]) {
  if (!objects.length) return "A shared story";
  const sorted = [...objects].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const first = new Date(sorted[0]!.occurredAt);
  const last = new Date(sorted.at(-1)!.occurredAt);
  const format = (date: Date, includeYear: boolean) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", ...(includeYear ? { year: "numeric" } : {}) }).format(date);
  if (first.toDateString() === last.toDateString()) return format(first, true);
  return `${format(first, first.getFullYear() !== last.getFullYear())} — ${format(last, true)}`;
}

const storyStyleNames: Record<StoryStyle, string> = { classic: "Classic", flipbook: "Flipbook", comic: "Comic", scrapbook: "Scrapbook", cinematic: "Cinematic" };

function hookLine(story: Story) {
  const opening = (story.canvas?.opening ?? story.opening).trim();
  const sentence = opening.split(/(?<=[.!?])\s+/)[0] ?? opening;
  return sentence.length > 130 ? `${sentence.slice(0, 127).trimEnd()}…` : sentence;
}

function StoryCover({ story, objects, onOpen }: { story: Story; objects: MomentObject[]; onOpen: () => void }) {
  const moments = storyMoments(story, objects);
  const hero = moments.find((object) => object.kind === "photo");
  const formatLabel = story.styleSource === "auto" ? `Auto · ${storyStyleNames[story.style]}` : storyStyleNames[story.style];
  return (
    <button onClick={onOpen} className="story-cover group relative min-h-[30rem] overflow-hidden rounded-[32px] bg-[#183128] text-left text-[#fff9ee] shadow-[0_30px_75px_rgba(37,47,39,.18)] sm:min-h-[34rem]">
      <div className="absolute inset-0 bg-[#344b40]">
        {hero ? <img src={api.objectContentUrl(hero.spaceId, hero.id)} alt="" className="size-full object-cover transition duration-[1400ms] ease-out group-hover:scale-[1.035]" /> : <div className="size-full bg-[#415a4c]" />}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(9,24,17,.9)_0%,rgba(9,24,17,.35)_45%,rgba(9,24,17,.28)_100%)]" />
      <div className="relative flex min-h-[30rem] flex-col justify-between p-7 sm:min-h-[34rem] sm:p-10 lg:p-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.24em] text-[#f0c681]"><Sparkles className="size-4" />{formatLabel} · {moments.length} moments</span>
          {story.location ? <span className="flex items-center gap-2 rounded-full bg-black/30 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#e9ddc7] backdrop-blur-sm"><MapPin className="size-3.5" />{story.location}</span> : null}
        </div>
        <div className="max-w-4xl">
          <h2 className="font-display text-[clamp(3.4rem,9vw,8.5rem)] leading-[.84] tracking-[-.055em] [text-shadow:0_4px_36px_rgba(0,0,0,.35)]">{story.title}</h2>
          <p className="mt-6 max-w-xl border-l-2 border-[#f0c681] pl-4 font-display text-lg italic leading-7 text-[#f3ead9] sm:text-2xl sm:leading-9">{hookLine(story)}</p>
          <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#fff8ec] px-5 py-3 text-sm font-bold text-[#26372f] shadow-lg transition group-hover:translate-x-1">Read the story <ArrowRight className="size-4" /></span>
        </div>
      </div>
    </button>
  );
}

function StoryMomentMedia({ moment, className, alt }: { moment: MomentObject; className?: string; alt?: string }) {
  return moment.kind === "photo"
    ? <img src={api.objectContentUrl(moment.spaceId, moment.id)} alt={alt ?? moment.caption ?? moment.name} className={cn("size-full object-cover", className)} />
    : <div className={cn("grid min-h-80 place-items-center bg-[#26372f] text-[#f0c681]", className)}><FileText className="size-14" /></div>;
}

function VoiceNoteExcerpt({ moment }: { moment: MomentObject }) {
  const player = useRef<HTMLAudioElement>(null);
  const stopAtExcerptEnd = () => {
    const audio = player.current;
    if (audio && audio.currentTime >= 5) {
      audio.pause();
      audio.currentTime = 0;
    }
  };
  const keepWithinExcerpt = () => {
    const audio = player.current;
    if (audio && audio.currentTime > 5) audio.currentTime = 5;
  };
  return <div className="voice-note-excerpt rounded-[22px] p-5 text-[#fff9ee] shadow-[0_20px_55px_rgba(24,49,40,.2)]"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#f0c681] text-[#26372f]"><FileAudio className="size-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#f0c681]">Voice note · 5 second excerpt</p><p className="mt-1 truncate text-sm font-semibold">{moment.caption || moment.name}</p></div></div><audio ref={player} className="mt-4 h-10 w-full" controls preload="metadata" src={api.objectContentUrl(moment.spaceId, moment.id)} onTimeUpdate={stopAtExcerptEnd} onSeeking={keepWithinExcerpt} /></div>;
}

function RouteInterlude({ location, index, total }: { location: string; index: number; total: number }) {
  return <aside className="route-interlude relative overflow-hidden px-5 py-14 text-center sm:py-20"><div className="route-interlude-line mx-auto flex max-w-lg items-center justify-between gap-4"><span className="route-pin">{String(index + 1).padStart(2, "0")}</span><span className="route-path" /><span className="route-pin route-pin--arrival">{String(index + 2).padStart(2, "0")}</span></div><div className="relative mt-6"><p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#b1604c]"><Route className="size-4" />The route continues</p><p className="mt-3 font-display text-3xl italic text-[#34443a] sm:text-4xl">{location} · chapter {index + 2} of {total}</p></div></aside>;
}

function InlineText({ value, onChange, editing, label, maxLength, singleLine = false, className, editClassName }: { value: string; onChange: (value: string) => void; editing: boolean; label: string; maxLength: number; singleLine?: boolean; className?: string | undefined; editClassName?: string | undefined }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = element.current;
    if (target && document.activeElement !== target && target.textContent !== value) target.textContent = value;
  }, [value]);
  function paste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain").slice(0, maxLength);
    document.execCommand("insertText", false, singleLine ? text.replace(/\s+/g, " ") : text);
  }
  return (
    <div
      ref={element}
      contentEditable={editing}
      suppressContentEditableWarning
      role={editing ? "textbox" : undefined}
      aria-label={editing ? label : undefined}
      aria-multiline={editing && !singleLine ? true : undefined}
      data-placeholder={editing ? `Edit ${label.toLowerCase()}` : undefined}
      onPaste={paste}
      onInput={(event) => {
        const target = event.currentTarget;
        const text = (target.textContent ?? "").slice(0, maxLength);
        if (target.textContent !== text) target.textContent = text;
        onChange(singleLine ? text.replace(/\s+/g, " ") : text);
      }}
      onKeyDown={(event) => {
        if (singleLine && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={cn(
        className,
        editing && "cursor-text rounded-lg outline outline-1 outline-dashed outline-[#f0c681]/65 transition hover:bg-white/10 hover:outline-solid focus:bg-white/10 focus:outline-2 focus:outline-solid focus:outline-[#f0c681] empty:before:text-current empty:before:opacity-45 empty:before:content-[attr(data-placeholder)]",
        editing && editClassName,
      )}
    />
  );
}

const galleryFormats: Array<{ id: StoryStyle; title: string; eyebrow: string; description: string }> = [
  { id: "classic", title: "Classic", eyebrow: "Timeless and editorial", description: "Spacious chapters that let every image and caption breathe." },
  { id: "scrapbook", title: "Scrapbook", eyebrow: "Personal and handmade", description: "Layered photographs, notes, and keepsakes collected over time." },
  { id: "cinematic", title: "Cinematic", eyebrow: "Immersive and dramatic", description: "Full-bleed scenes give bigger journeys room to unfold." },
];

function GalleryFormatPreview({ format, story, objects, onOpen }: { format: (typeof galleryFormats)[number]; story?: Story | undefined; objects: MomentObject[]; onOpen: () => void }) {
  const photos = story ? storyMoments(story, objects).filter((object) => object.kind === "photo").slice(0, 3) : [];
  const src = (index: number) => photos[index] ? api.objectContentUrl(photos[index]!.spaceId, photos[index]!.id) : undefined;
  const image = (index: number, className: string) => src(index) ? <img src={src(index)} alt="" className={className} /> : <div className={cn(className, "bg-[#b8c4bb]")} />;

  return (
    <button type="button" onClick={onOpen} disabled={!story} className={cn("story-format-card group overflow-hidden rounded-[26px] border text-left shadow-[0_18px_45px_rgba(62,48,31,.08)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(62,48,31,.15)] disabled:cursor-default disabled:opacity-60", `story-format-${format.id}`)}>
      <div className="story-format-stage relative h-44 overflow-hidden sm:h-48">
        {format.id === "classic" ? <>
          <div className="absolute inset-0 bg-[#f5ecde] p-5">
            <div className="story-format-classic-page grid h-full grid-cols-[1.25fr_.75fr] overflow-hidden rounded-[6px] bg-[#fffaf2] shadow-lg">
              {image(0, "h-full w-full object-cover")}
              <div className="flex flex-col justify-end p-3"><span className="font-display text-2xl italic text-[#bd705e]">01</span><span className="mt-2 h-1.5 w-full rounded bg-[#293b32]" /><span className="mt-1.5 h-1 w-3/4 rounded bg-[#c9bcaa]" /><span className="mt-1 h-1 w-1/2 rounded bg-[#d7cdbc]" /></div>
            </div>
          </div>
        </> : null}
        {format.id === "scrapbook" ? <>
          <div className="paper-grid absolute inset-0 bg-[#e8dfcf]">
            <div className="story-format-tape absolute left-[18%] top-3 z-10 h-4 w-14 -rotate-6 bg-[#e8aa90]/75" />
            <div className="story-format-scrap-photo absolute left-[12%] top-5 h-[7.8rem] w-[43%] -rotate-6 bg-[#fffaf2] p-1.5 pb-5 shadow-lg">{image(0, "size-full object-cover")}</div>
            <div className="story-format-scrap-photo absolute right-[10%] top-7 h-[7.5rem] w-[42%] rotate-5 bg-[#fffaf2] p-1.5 pb-5 shadow-lg [--format-scrap-tilt:5deg] [animation-delay:-2.3s]">{image(1, "size-full object-cover")}</div>
            <span className="absolute bottom-3 left-[34%] rotate-[-3deg] font-display text-lg italic text-[#a9503f]">keep this day</span>
          </div>
        </> : null}
        {format.id === "cinematic" ? <>
          {image(0, "story-format-cinema-image absolute inset-0 size-full object-cover")}
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,18,12,.9),transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 h-3 bg-[#101b16]" /><div className="absolute inset-x-0 bottom-0 h-3 bg-[#101b16]" />
          <div className="absolute bottom-6 left-5 text-[#fffaf2]"><span className="text-[8px] font-bold uppercase tracking-[.2em] text-[#f0c681]">Scene 01</span><p className="mt-1 font-display text-2xl leading-none">The road opened.</p></div>
        </> : null}
      </div>
      <div className="flex min-h-40 flex-col bg-[#fffaf2] p-5">
        <p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#a9503f]">{format.eyebrow}</p>
        <div className="mt-2 flex items-center justify-between gap-3"><h3 className="font-display text-3xl leading-none text-[#26372f]">{format.title}</h3><ArrowRight className="size-4 text-[#a9503f] transition group-hover:translate-x-1" /></div>
        <p className="mt-3 text-xs leading-5 text-[#71695f]">{format.description}</p>
        <span className="mt-auto pt-3 text-[10px] font-bold text-[#526158]">Open the live example</span>
      </div>
    </button>
  );
}

function StoryMoments({ story, moments, canvas, editing, onMomentChange, onBlueprintChange }: { story: Story; moments: MomentObject[]; canvas: StoryCanvas; editing: boolean; onMomentChange: (momentId: string, field: keyof Pick<StoryCanvasMoment, "title" | "meta">, value: string) => void; onBlueprintChange: (blueprint: StoryBlueprint) => void }) {
  const canvasById = new Map(canvas.moments.map((moment) => [moment.momentId, moment]));
  const momentById = new Map(moments.map((moment) => [moment.id, moment]));
  const blueprint = canvas.blueprint ?? story.blueprint ?? { summary: canvas.opening, chapters: [{ id: "chapter-1", beat: "arrival" as const, title: "The journey", narration: canvas.opening, momentIds: moments.map((moment) => moment.id) }], closing: "This is the part we chose to keep." };
  const location = story.canvas?.location ?? story.location;
  const updateChapter = (chapterId: string, field: "title" | "narration", value: string) => onBlueprintChange({ ...blueprint, chapters: blueprint.chapters.map((chapter) => chapter.id === chapterId ? { ...chapter, [field]: value } : chapter) });
  const content = (moment: MomentObject) => canvasById.get(moment.id) ?? { momentId: moment.id, title: moment.caption || moment.name, meta: "" };
  const chapterMoments = (ids: string[]) => ids.map((id) => momentById.get(id)).filter((moment): moment is MomentObject => Boolean(moment));
  const scene = (moment: MomentObject, compact = false) => {
    const value = content(moment);
    if (moment.kind === "audio") return <VoiceNoteExcerpt key={moment.id} moment={moment} />;
    return <figure key={moment.id} className="overflow-hidden rounded-[22px] bg-[#fffaf2] shadow-[0_20px_55px_rgba(55,45,32,.14)]"><div className={cn("overflow-hidden bg-[#d8cbbb]", compact ? "aspect-square" : "aspect-[4/3]")}><StoryMomentMedia moment={moment} alt={value.title} /></div><figcaption className="p-4 sm:p-5"><InlineText value={value.title} onChange={(next) => onMomentChange(moment.id, "title", next)} editing={editing} label="scene title" maxLength={200} singleLine className="font-display text-2xl leading-none text-[#26372f]" /><InlineText value={value.meta} onChange={(next) => onMomentChange(moment.id, "meta", next)} editing={editing} label="scene details" maxLength={200} singleLine className="mt-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#756e64]" /></figcaption></figure>;
  };
  const route = (index: number) => location && index < blueprint.chapters.length - 1 ? <RouteInterlude location={location} index={index} total={blueprint.chapters.length} /> : null;
  const closing = <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b1604c]">What stayed with us</p><InlineText value={blueprint.closing} onChange={(value) => onBlueprintChange({ ...blueprint, closing: value })} editing={editing} label="closing reflection" maxLength={1200} className="mt-5 font-display text-3xl italic leading-tight sm:text-5xl" /></div>;

  if (story.style === "scrapbook") return <div className="paper-grid"><div className="mx-auto grid max-w-[92rem] gap-16 px-5 py-12 sm:px-10 sm:py-20">{blueprint.chapters.map((chapter, index) => <div key={chapter.id}><section className={cn("rounded-[28px] bg-[#eadfcd] p-5 shadow-[0_24px_65px_rgba(70,53,33,.14)] sm:p-8", index % 2 ? "rotate-[.35deg]" : "-rotate-[.35deg]")}><p className="font-display text-5xl italic text-[#b1604c]">{String(index + 1).padStart(2, "0")}</p><InlineText value={chapter.title} onChange={(value) => updateChapter(chapter.id, "title", value)} editing={editing} label="chapter title" maxLength={120} singleLine className="mt-2 font-display text-4xl leading-none sm:text-6xl" /><InlineText value={chapter.narration} onChange={(value) => updateChapter(chapter.id, "narration", value)} editing={editing} label="chapter narration" maxLength={1600} className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#675f55] sm:text-base" /><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{chapterMoments(chapter.momentIds).map((moment) => scene(moment, true))}</div></section>{route(index)}</div>)}</div>{closing}</div>;

  if (story.style === "cinematic") return <div className="bg-[#101b16] text-[#fffaf2]">{blueprint.chapters.map((chapter, index) => {
    const scenes = chapterMoments(chapter.momentIds);
    const hero = scenes[0];
    return <div key={chapter.id}><section><div className="relative min-h-[78dvh] overflow-hidden">{hero ? <StoryMomentMedia moment={hero} alt={content(hero).title} className="absolute inset-0" /> : null}<div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,14,9,.95),rgba(5,14,9,.1)_70%),linear-gradient(90deg,rgba(5,14,9,.55),transparent_65%)]" /><div className="relative mx-auto flex min-h-[78dvh] max-w-[92rem] items-end px-5 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20"><div className="max-w-4xl"><p className="font-display text-6xl italic text-[#f0c681]/70">{String(index + 1).padStart(2, "0")}</p><InlineText value={chapter.title} onChange={(value) => updateChapter(chapter.id, "title", value)} editing={editing} label="chapter title" maxLength={120} singleLine className="mt-3 font-display text-[clamp(3rem,11vw,8rem)] leading-[.86] tracking-[-.055em]" /><InlineText value={chapter.narration} onChange={(value) => updateChapter(chapter.id, "narration", value)} editing={editing} label="chapter narration" maxLength={1600} className="mt-6 max-w-2xl whitespace-pre-wrap text-base leading-7 text-[#e6ded1] sm:text-xl sm:leading-8" /></div></div></div>{scenes.length > 1 ? <div className="mx-auto grid max-w-[92rem] gap-5 px-5 py-10 sm:grid-cols-2 sm:px-10 lg:grid-cols-3 lg:px-16">{scenes.slice(1).map((moment) => scene(moment, true))}</div> : null}</section>{route(index)}</div>;
  })}{closing}</div>;

  return <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-8 sm:py-20 lg:py-28"><div className="grid gap-20 sm:gap-28">{blueprint.chapters.map((chapter, index) => <div key={chapter.id}><section className="story-reader-chapter"><div className="mb-8 grid gap-4 lg:grid-cols-[.32fr_1fr] lg:gap-12"><p className="font-display text-6xl italic text-[#cfb99b]">{String(index + 1).padStart(2, "0")}</p><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9a5747]">{chapter.beat.replace("-", " ")}</p><InlineText value={chapter.title} onChange={(value) => updateChapter(chapter.id, "title", value)} editing={editing} label="chapter title" maxLength={120} singleLine className="mt-2 font-display text-4xl leading-none sm:text-6xl" /><InlineText value={chapter.narration} onChange={(value) => updateChapter(chapter.id, "narration", value)} editing={editing} label="chapter narration" maxLength={1600} className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#756e64] sm:text-base" /></div></div><div className="grid gap-5 sm:grid-cols-2">{chapterMoments(chapter.momentIds).map((moment) => scene(moment))}</div></section>{route(index)}</div>)}</div>{closing}</div>;
}

export function StoryShelf({ stories, objects, isDemo, onOpen, onCreate, onAddMoments }: { stories: Story[]; objects: MomentObject[]; isDemo: boolean; onOpen: (story: Story) => void; onCreate: () => void; onAddMoments: () => void }) {
  if (!stories.length) {
    return (
      <div className="mx-auto max-w-3xl rounded-[34px] border border-[#d9cdbc] bg-[#fff9ef] px-6 py-14 text-center shadow-[0_22px_65px_rgba(70,55,37,.08)] sm:px-12">
        <div className="mx-auto grid size-16 place-items-center rounded-[22px] bg-[#26372f] text-[#f0c681]"><BookOpen className="size-7" /></div>
        <p className="mt-7 text-[10px] font-bold uppercase tracking-[.22em] text-[#a9503f]">More than an album</p>
        <h2 className="mx-auto mt-3 max-w-xl font-display text-4xl leading-[.98] tracking-[-.035em] text-[#26372f] sm:text-6xl">Turn the moments into something worth retelling.</h2>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#71695f]">Choose the photos that belong together, add the context only your people know, and shape them into a story with a beginning, a journey, and a reason to return.</p>
        <Button className="mt-8" onClick={objects.length >= 2 ? onCreate : onAddMoments}>{objects.length >= 2 ? <><Sparkles className="size-4" />Craft your first story</> : <><ImagePlus className="size-4" />Add moments first</>}</Button>
      </div>
    );
  }
  if (isDemo) {
    const storyByFormat = new Map<StoryStyle, Story>();
    stories.forEach((story) => {
      if (!storyByFormat.has(story.style)) storyByFormat.set(story.style, story);
    });
    return (
      <div>
        <div className="mb-7 overflow-hidden rounded-[30px] border border-[#d8cbb8] bg-[#fff8ec] px-6 py-7 sm:px-8 sm:py-8">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a9503f]">Demo story gallery</p>
          <div className="mt-3 max-w-3xl">
            <h2 className="font-display text-4xl leading-[.95] tracking-[-.04em] text-[#26372f] sm:text-5xl">Three focused ways to tell the adventure.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#71695f]">Choose an editorial journal, a tactile keepsake, or an immersive journey. Each format has a clear purpose and opens into a complete demo story.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {galleryFormats.map((format) => {
              const story = storyByFormat.get(format.id);
              return <GalleryFormatPreview key={format.id} format={format} story={story} objects={objects} onOpen={() => { if (story) onOpen(story); }} />;
            })}
          </div>
        </div>
      </div>
    );
  }
  return <div className="grid gap-8">{stories.map((story) => <StoryCover key={story.id} story={story} objects={objects} onOpen={() => onOpen(story)} />)}</div>;
}

export function StoryDialog({ open, onClose, spaceId, objects, story, onSaved }: { open: boolean; onClose: () => void; spaceId: string; objects: MomentObject[]; story?: Story | null; onSaved: (story: Story) => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [style, setStyle] = useState<StoryStylePreference>("auto");
  const [styleSource, setStyleSource] = useState<StoryStyleSource>("auto");
  const [styleRationale, setStyleRationale] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [opening, setOpening] = useState("");
  const [blueprint, setBlueprint] = useState<StoryBlueprint | null>(null);
  const chronological = useMemo(() => [...objects].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)), [objects]);
  const hasEnoughMoments = selected.length >= 2;
  useEffect(() => {
    if (open && story) {
      const available = new Set(objects.map((object) => object.id));
      setSelected(story.momentIds.filter((momentId) => available.has(momentId)));
      setStyle(story.styleSource === "auto" ? "auto" : story.style === "flipbook" || story.style === "comic" ? "classic" : story.style);
      setStyleSource(story.styleSource);
      setStyleRationale(story.styleRationale ?? "");
      setTitle(story.title);
      setLocation(story.location ?? "");
      setOpening(story.opening);
      setBlueprint(story.blueprint ?? null);
    } else if (!open) {
      setSelected([]);
      setStyle("auto");
      setStyleSource("auto");
      setStyleRationale("");
      setTitle("");
      setLocation("");
      setOpening("");
      setBlueprint(null);
    }
  }, [open, story, objects]);
  useEffect(() => {
    if (hasEnoughMoments) return;
    setStyle("auto");
    setStyleSource("auto");
    setStyleRationale("");
  }, [hasEnoughMoments]);
  const mutation = useMutation({
    mutationFn: (input: { title: string; location?: string; opening: string; momentIds: string[]; style: StoryStylePreference; styleSource: StoryStyleSource; styleRationale?: string; blueprint?: StoryBlueprint }) => story ? api.updateStory(spaceId, story.id, input) : api.createStory(spaceId, input),
    onSuccess: async ({ story: savedStory }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stories", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["social-exports", spaceId, savedStory.id] }),
      ]);
      toast.success(story ? "Story changes saved" : "Your story is ready to read");
      onSaved(savedStory);
    },
  });
  const suggest = useMutation({
    mutationFn: (momentIds: string[]) => api.suggestStoryStyle(spaceId, { momentIds }),
    onSuccess: (suggestion) => {
      setStyle(suggestion.style === "flipbook" || suggestion.style === "comic" ? "classic" : suggestion.style);
      setStyleSource(suggestion.source);
      setStyleRationale(suggestion.rationale);
      toast.success(suggestion.source === "ai" ? "AI suggested a story format" : "A private automatic suggestion is ready");
    },
  });
  const draftOpening = useMutation({
    mutationFn: (momentIds: string[]) => api.suggestStoryOpening(spaceId, {
      momentIds,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
    }),
    onSuccess: (draft) => {
      setOpening(draft.opening);
      setBlueprint(null);
      toast.success(draft.source === "ai" ? "AI drafted an opening for you" : "A private opening draft is ready");
    },
  });
  const draftBlueprint = useMutation({
    mutationFn: async () => {
      const momentIds = chronological.filter((object) => selected.includes(object.id)).map((object) => object.id);
      let nextOpening = opening.trim();
      if (nextOpening.length < 10) {
        const draft = await api.suggestStoryOpening(spaceId, { momentIds, ...(title.trim() ? { title: title.trim() } : {}), ...(location.trim() ? { location: location.trim() } : {}) });
        nextOpening = draft.opening;
      }
      const result = await api.suggestStoryBlueprint(spaceId, { momentIds, opening: nextOpening, ...(title.trim() ? { title: title.trim() } : {}), ...(location.trim() ? { location: location.trim() } : {}) });
      return { ...result, opening: nextOpening };
    },
    onSuccess: (draft) => {
      setOpening(draft.opening);
      setBlueprint(draft.blueprint);
      toast.success(draft.source === "ai" ? "AI shaped the journey into chapters" : "A private story blueprint is ready");
    },
  });
  function toggle(id: string) {
    setBlueprint(null);
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const momentIds = chronological.filter((object) => selected.includes(object.id)).map((object) => object.id);
    mutation.mutate({ title, opening, momentIds, style, styleSource, ...(styleRationale ? { styleRationale } : {}), ...(location.trim() ? { location: location.trim() } : {}), ...(blueprint ? { blueprint } : {}) });
  }
  const formats: Array<{ id: StoryStylePreference; title: string; description: string; icon: typeof BookOpen }> = [
    { id: "classic", title: "Classic", description: "Timeless editorial chapters with generous space.", icon: BookOpen },
    { id: "scrapbook", title: "Scrapbook", description: "Layered keepsakes, notes, and tactile details.", icon: ImagePlus },
    { id: "cinematic", title: "Cinematic", description: "Immersive full-bleed scenes for bigger journeys.", icon: Film },
  ];
  return (
    <Modal open={open} onClose={onClose} title={story ? "Edit story" : "Craft a story"} description={story ? "Update its words, moments, or presentation. Existing exports will be cleared." : "Give the moments their meaning. Your selections will read from oldest to newest."} size="xl">
      <form className="grid gap-7" onSubmit={submit}>
        <section className="grid items-start gap-4 rounded-[24px] bg-[#f3ebdf] p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">01 · Name the chapter</p></div>
          <Field label="Story title"><Input name="title" value={title} onChange={(event) => { setTitle(event.target.value); setBlueprint(null); }} placeholder="The weekend the rain followed us" minLength={2} maxLength={100} required /></Field>
          <Field label="Place or route" hint="Optional"><Input name="location" value={location} onChange={(event) => { setLocation(event.target.value); setBlueprint(null); }} placeholder="Kyoto · Spring 2026" maxLength={100} /></Field>
        </section>
        <section>
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">02 · Choose the moments</p><p className="mt-1 text-sm text-[#746d63]">Pick at least two. They will read from oldest to newest.</p></div><span className="shrink-0 rounded-full bg-[#e9dfd0] px-3 py-1.5 text-xs font-bold text-[#536158]">{selected.length} selected</span></div>
          <div className="grid max-h-[42vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
            {chronological.map((object) => {
              const active = selected.includes(object.id);
              return <button key={object.id} type="button" onClick={() => toggle(object.id)} className={cn("relative overflow-hidden rounded-[18px] border-2 bg-[#e6dccd] text-left transition", active ? "border-[#a9503f] shadow-[0_10px_28px_rgba(169,80,63,.16)]" : "border-transparent hover:border-[#ad9e89]")}>
                <div className="aspect-square">{object.kind === "photo" ? <img src={api.objectContentUrl(spaceId, object.id)} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[#526158]"><FileText className="size-8" /></div>}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <span className={cn("absolute right-2 top-2 grid size-7 place-items-center rounded-full border text-white transition", active ? "border-[#a9503f] bg-[#a9503f]" : "border-white/70 bg-black/25")}><Check className={cn("size-4", !active && "opacity-0")} /></span>
                <span className="absolute inset-x-3 bottom-3 line-clamp-2 text-xs font-semibold text-white">{object.caption || object.name}</span>
              </button>;
            })}
          </div>
        </section>
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">03 · Choose the theme</p><p className="mt-1 text-sm text-[#746d63]">{hasEnoughMoments ? "Change the visual mood without changing the journey." : "Choose at least two moments above to unlock the themes."}</p></div><Button type="button" variant="secondary" disabled={!hasEnoughMoments || suggest.isPending} onClick={() => suggest.mutate(chronological.filter((object) => selected.includes(object.id)).map((object) => object.id))}>{suggest.isPending ? <><Spinner />AI is reviewing the sequence…</> : <><Sparkles className="size-4" />Ask AI to suggest</>}</Button></div>
          <button type="button" disabled={!hasEnoughMoments} onClick={() => { setStyle("auto"); setStyleSource("auto"); setStyleRationale(""); }} className={cn("mb-3 flex w-full items-center gap-4 rounded-[20px] border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50", style === "auto" ? "border-[#a9503f] bg-[#fff8ec] shadow-[0_10px_28px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f4ede1] hover:border-[#b9aa96]")}><span className={cn("grid size-10 shrink-0 place-items-center rounded-[14px]", style === "auto" ? "bg-[#a9503f] text-white" : "bg-[#e4d8c7] text-[#526158]")}><WandSparkles className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-[#26372f]">Choose for me</strong><span className="mt-1 block text-xs leading-5 text-[#7a7267]">Privately select the best fit from Classic, Scrapbook, or Cinematic.</span></span>{style === "auto" && hasEnoughMoments ? <Check className="size-4 shrink-0 text-[#a9503f]" /> : null}</button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((format) => <button key={format.id} type="button" disabled={!hasEnoughMoments} onClick={() => { setStyle(format.id); setStyleSource(format.id === "auto" ? "auto" : "manual"); setStyleRationale(""); }} className={cn("rounded-[20px] border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50", style === format.id ? "border-[#a9503f] bg-[#fff8ec] shadow-[0_10px_28px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f4ede1] hover:border-[#b9aa96]")}><div className="flex items-center justify-between"><span className={cn("grid size-10 place-items-center rounded-[14px]", style === format.id ? "bg-[#a9503f] text-white" : "bg-[#e4d8c7] text-[#526158]")}><format.icon className="size-4" /></span>{style === format.id && hasEnoughMoments ? <Check className="size-4 text-[#a9503f]" /> : null}</div><strong className="mt-3 block text-sm text-[#26372f]">{format.title}</strong><span className="mt-1 block text-xs leading-5 text-[#7a7267]">{format.description}</span></button>)}
          </div>
          {styleRationale ? <div className="mt-4 flex gap-3 rounded-[18px] border border-[#d5dfd5] bg-[#edf3ed] p-4 text-xs leading-5 text-[#526158]"><Sparkles className="mt-0.5 size-4 shrink-0 text-[#496151]" /><p><strong className="text-[#34443a]">AI suggests {formats.find((format) => format.id === style)?.title}.</strong> {styleRationale} You can still choose any other format.</p></div> : null}
          <p className="mt-3 text-[11px] leading-5 text-[#8a8277]">AI is optional. When used, Zo receives only filenames, captions, dates, and media types, not your photos or files.</p>
        </section>
        <section className="grid gap-4 rounded-[24px] bg-[#20372d] p-5 text-[#fff9ee]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">04 · Shape the journey</p><p className="mt-2 text-sm leading-6 text-[#d8ddd8]">Add the context only your people know, then organise every moment into editable chapters.</p></div><div className="flex shrink-0 flex-wrap gap-2"><Button type="button" variant="secondary" disabled={!hasEnoughMoments || draftOpening.isPending} onClick={() => draftOpening.mutate(chronological.filter((object) => selected.includes(object.id)).map((object) => object.id))}>{draftOpening.isPending ? <><Spinner />Drafting…</> : <><WandSparkles className="size-4" />Draft opening</>}</Button><Button type="button" variant="secondary" disabled={!hasEnoughMoments || draftBlueprint.isPending} onClick={() => draftBlueprint.mutate()}>{draftBlueprint.isPending ? <><Spinner />Writing chapters…</> : <><BookOpen className="size-4" />Draft full story</>}</Button></div></div>
          <textarea name="opening" value={opening} onChange={(event) => { setOpening(event.target.value); setBlueprint(null); }} required minLength={10} maxLength={1200} rows={4} placeholder="It started before sunrise, with three coffees and no idea where the day would take us…" className="min-h-32 w-full resize-y rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/45 focus:border-[#f0c681]" />
          {blueprint ? <div className="rounded-[18px] border border-white/15 bg-white/8 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[#f0c681]">Journey blueprint ready</p><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em]">{blueprint.chapters.length} chapters</span></div><div className="mt-3 grid gap-2">{blueprint.chapters.map((chapter, index) => <div key={chapter.id} className="flex items-center gap-3 rounded-xl bg-black/10 px-3 py-2"><span className="font-display text-xl italic text-[#f0c681]">{String(index + 1).padStart(2, "0")}</span><div><strong className="block text-xs">{chapter.title}</strong><span className="text-[10px] text-white/55">{chapter.momentIds.length} {chapter.momentIds.length === 1 ? "moment" : "moments"} · {chapter.beat.replace("-", " ")}</span></div></div>)}</div></div> : null}
          <p className="text-[11px] leading-5 text-[#bfc9c2]">AI uses only filenames, captions, dates, and media types, never the media bytes. Everything remains editable.</p>
        </section>
        {mutation.error ? <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{mutation.error instanceof ZoMomentsApiError ? mutation.error.message : `The story could not be ${story ? "updated" : "created"}`}</p> : null}
        <div className="sticky -bottom-4 z-20 -mx-4 border-t border-[#e2d7c8] bg-[#fffaf2]/96 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:static sm:m-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0"><Button className="w-full sm:w-auto" disabled={!hasEnoughMoments || mutation.isPending || draftBlueprint.isPending}>{mutation.isPending ? <Spinner /> : story ? <><PencilLine className="size-4" />Save changes</> : <><Sparkles className="size-4" />Create the storybook</>}</Button></div>
      </form>
    </Modal>
  );
}

function fallbackCanvas(story: Story, objects: MomentObject[]): StoryCanvas {
  const moments = storyMoments(story, objects);
  return {
    title: story.title,
    location: story.location ?? "",
    dateRange: storyDateRange(moments),
    opening: story.opening,
    moments: moments.map((moment) => ({ momentId: moment.id, title: moment.caption || moment.name, meta: "" })),
    blueprint: story.blueprint,
  };
}

function StoryHistoryDialog({ open, story, currentCanvas, onClose, onRestored }: { open: boolean; story: Story; currentCanvas: StoryCanvas; onClose: () => void; onRestored: (story: Story) => void }) {
  const queryClient = useQueryClient();
  const revisions = useQuery({
    queryKey: ["story-revisions", story.spaceId, story.id],
    queryFn: () => api.listStoryRevisions(story.spaceId, story.id),
    enabled: open,
  });
  const restore = useMutation({
    mutationFn: (revision: StoryRevision) => api.restoreStoryRevision(story.spaceId, story.id, revision.id),
    onSuccess: async ({ story: restored }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stories", story.spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["story-revisions", story.spaceId, story.id] }),
        queryClient.invalidateQueries({ queryKey: ["social-exports", story.spaceId, story.id] }),
      ]);
      onRestored(restored);
      onClose();
      toast.success("Earlier version restored");
    },
  });
  const when = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return (
    <Modal open={open} onClose={onClose} title="Version history" description="Zo Moments keeps a snapshot before every autosaved change. Restoring one also preserves your current version." size="lg">
      <div className="grid gap-3">
        <div className="rounded-[20px] border-2 border-[#8ca091] bg-[#edf3ed] p-5">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-[#496151]">Current version</span><Cloud className="size-4 text-[#496151]" /></div>
          <h3 className="mt-3 font-display text-2xl leading-tight text-[#26372f]">{currentCanvas.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#667168]">{currentCanvas.opening}</p>
        </div>
        {revisions.isLoading ? <div className="grid min-h-40 place-items-center text-[#657169]"><Spinner /></div> : null}
        {revisions.error ? <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">Version history could not be loaded.</p> : null}
        {revisions.data?.revisions.length === 0 ? <div className="rounded-[20px] border border-dashed border-[#cfc1af] p-8 text-center"><History className="mx-auto size-6 text-[#9a5747]" /><p className="mt-3 text-sm text-[#756e64]">Your first snapshot will appear after you change the story.</p></div> : null}
        {revisions.data?.revisions.map((revision) => <div key={revision.id} className="flex flex-col gap-4 rounded-[20px] border border-[#ddd1c1] bg-[#fffdf8] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9a5747]">{when(revision.createdAt)}</p><h3 className="mt-2 truncate font-display text-2xl text-[#26372f]">{revision.canvas.title}</h3><p className="mt-1 line-clamp-1 text-sm text-[#756e64]">{revision.canvas.opening}</p></div><Button type="button" variant="secondary" className="shrink-0" disabled={restore.isPending} onClick={() => restore.mutate(revision)}>{restore.isPending && restore.variables?.id === revision.id ? <Spinner /> : <RotateCcw className="size-4" />}Restore</Button></div>)}
      </div>
    </Modal>
  );
}

export function StoryReader({ story, objects, canEdit, canDelete, reveal = false, onClose, onStoryChanged, onDelete }: { story: Story | null; objects: MomentObject[]; canEdit: boolean; canDelete: boolean; reveal?: boolean; onClose: () => void; onStoryChanged: (story: Story) => void; onDelete: (story: Story) => void }) {
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [canvas, setCanvas] = useState<StoryCanvas>({ title: "", location: "", dateRange: "", opening: "", moments: [] });
  const canvasRef = useRef(canvas);
  const savedCanvasRef = useRef("");
  const canvasSerialised = JSON.stringify(canvas);
  const canvasValid = canvas.title.trim().length >= 2
    && canvas.opening.trim().length >= 10
    && canvas.moments.every((moment) => moment.title.trim().length > 0)
    && (!canvas.blueprint || (canvas.blueprint.closing.trim().length >= 10 && canvas.blueprint.chapters.every((chapter) => chapter.title.trim().length > 0 && chapter.narration.trim().length > 0)));
  const dirty = canvasSerialised !== savedCanvasRef.current;
  const saveCanvas = useMutation({
    mutationFn: ({ spaceId, storyId, value }: { spaceId: string; storyId: string; value: StoryCanvas }) => api.updateStoryCanvas(spaceId, storyId, { canvas: value }),
    onSuccess: async ({ story: saved }, variables) => {
      const savedCanvas = saved.canvas ?? variables.value;
      savedCanvasRef.current = JSON.stringify(savedCanvas);
      if (JSON.stringify(canvasRef.current) === JSON.stringify(variables.value)) {
        canvasRef.current = savedCanvas;
        setCanvas(savedCanvas);
      }
      onStoryChanged(saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stories", saved.spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["story-revisions", saved.spaceId, saved.id] }),
        queryClient.invalidateQueries({ queryKey: ["social-exports", saved.spaceId, saved.id] }),
      ]);
    },
  });
  const changeTheme = useMutation({
    mutationFn: (style: "classic" | "scrapbook" | "cinematic") => api.updateStory(story!.spaceId, story!.id, {
      title: canvas.title,
      location: canvas.location || undefined,
      opening: canvas.opening,
      momentIds: story!.momentIds,
      style,
      styleSource: "manual",
      ...(canvas.blueprint ? { blueprint: canvas.blueprint } : {}),
    }),
    onSuccess: async ({ story: saved }) => {
      onStoryChanged(saved);
      await queryClient.invalidateQueries({ queryKey: ["stories", saved.spaceId] });
    },
  });
  useEffect(() => { canvasRef.current = canvas; }, [canvas]);
  useEffect(() => {
    if (!story) return;
    const next = story.canvas ?? fallbackCanvas(story, objects);
    canvasRef.current = next;
    savedCanvasRef.current = JSON.stringify(next);
    setCanvas(next);
    setEditing(false);
    setShareOpen(false);
    setHistoryOpen(false);
    saveCanvas.reset();
  }, [story?.id]);
  useEffect(() => {
    if (!editing || !story || !canvasValid || !dirty || saveCanvas.isPending) return;
    const timer = window.setTimeout(() => saveCanvas.mutate({ spaceId: story.spaceId, storyId: story.id, value: canvas }), 800);
    return () => window.clearTimeout(timer);
  }, [canvas, canvasValid, dirty, editing, saveCanvas.isPending, story]);
  useEffect(() => {
    if (!story) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !shareOpen && !historyOpen && !editing) onClose(); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", close); };
  }, [editing, historyOpen, onClose, shareOpen, story]);
  if (!story) return null;
  const moments = storyMoments(story, objects);
  const hero = moments.find((object) => object.kind === "photo");
  const updateCanvas = <K extends keyof StoryCanvas>(field: K, value: StoryCanvas[K]) => setCanvas((current) => ({ ...current, [field]: value }));
  const updateMoment = (momentId: string, field: keyof Pick<StoryCanvasMoment, "title" | "meta">, value: string) => setCanvas((current) => ({ ...current, moments: current.moments.map((moment) => moment.momentId === momentId ? { ...moment, [field]: value } : moment) }));
  const updateBlueprint = (blueprint: StoryBlueprint) => setCanvas((current) => ({ ...current, blueprint }));
  const finishEditing = () => {
    if (!canvasValid) return;
    if (!dirty) {
      setEditing(false);
      return;
    }
    saveCanvas.mutate({ spaceId: story.spaceId, storyId: story.id, value: canvas }, {
      onSuccess: ({ story: saved }) => {
        if (JSON.stringify(canvasRef.current) === JSON.stringify(saved.canvas)) setEditing(false);
      },
    });
  };
  const restored = (restoredStory: Story) => {
    const next = restoredStory.canvas ?? fallbackCanvas(restoredStory, objects);
    canvasRef.current = next;
    savedCanvasRef.current = JSON.stringify(next);
    setCanvas(next);
    onStoryChanged(restoredStory);
  };
  const saveLabel = !canvasValid ? "Finish required text" : saveCanvas.isPending ? "Saving…" : saveCanvas.isError ? "Save failed" : dirty ? "Changes pending" : "Saved";
  return (
    <>
      <article data-editing={editing || undefined} data-reveal={reveal || undefined} className="fixed inset-0 z-[60] overflow-y-auto bg-[#f3eadc] text-[#23372d]">
        <div className="fixed right-3 top-[max(.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-2 sm:right-4 sm:top-4">
          {editing ? <><span className={cn("inline-flex size-11 items-center justify-center rounded-full bg-[#183128]/88 text-[#fff9ee] shadow-xl backdrop-blur-md sm:hidden", saveCanvas.isError && "bg-[#8a372b]")} aria-label={saveLabel}>{saveCanvas.isPending ? <Spinner /> : <Cloud className="size-4" />}</span><span className={cn("hidden h-11 items-center gap-2 rounded-full bg-[#183128]/88 px-4 text-xs font-bold text-[#fff9ee] shadow-xl backdrop-blur-md sm:inline-flex", saveCanvas.isError && "bg-[#8a372b]")}>{saveCanvas.isPending ? <Spinner /> : <Cloud className="size-4" />}{saveLabel}</span><button onClick={() => setHistoryOpen(true)} className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-[#fff9ee]/94 text-sm font-bold text-[#26372f] shadow-xl backdrop-blur-md sm:h-12 sm:w-auto sm:px-5" aria-label="Version history"><History className="size-4" /><span className="hidden sm:inline">Versions</span></button><button onClick={finishEditing} disabled={!canvasValid || saveCanvas.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f0c681] px-4 text-sm font-bold text-[#26372f] shadow-xl transition hover:bg-[#f6d795] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:px-5"><Check className="size-4" />Done</button></> : <>{canEdit ? <button onClick={() => setEditing(true)} className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-[#fff9ee]/90 text-sm font-bold text-[#26372f] shadow-xl backdrop-blur-md transition hover:scale-[1.03] sm:h-12 sm:w-auto sm:px-5" aria-label="Edit story"><PencilLine className="size-4" /><span className="hidden sm:inline">Edit</span></button> : null}<button onClick={() => setShareOpen(true)} className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-[#f0c681] text-sm font-bold text-[#26372f] shadow-xl backdrop-blur-md transition hover:scale-[1.03] hover:bg-[#f6d795] sm:h-12 sm:w-auto sm:px-5" aria-label="Share story"><Share2 className="size-4" /><span className="hidden sm:inline">Share story</span></button><button onClick={onClose} className="grid size-11 place-items-center rounded-full bg-[#fff9ee]/90 shadow-xl backdrop-blur-md transition hover:scale-105 sm:size-12" aria-label="Close story"><X className="size-5" /></button></>}
        </div>
        <header className="relative min-h-[76dvh] overflow-hidden bg-[#183128] text-[#fff9ee] sm:min-h-[88vh]">
          {hero ? <img src={api.objectContentUrl(hero.spaceId, hero.id)} alt="" className="story-reveal-photo absolute inset-0 size-full object-cover" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,26,19,.96),rgba(9,26,19,.47)_60%,rgba(9,26,19,.18)),linear-gradient(0deg,rgba(9,26,19,.74),transparent_58%)]" />
          <div className="relative mx-auto flex min-h-[76dvh] max-w-[92rem] flex-col justify-between px-5 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))] sm:min-h-[88vh] sm:px-10 sm:py-10 lg:px-16 lg:py-14">
            {editing ? <span className="mt-14 flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f0c681] sm:mt-0"><PencilLine className="size-4" />Tap any outlined text to edit</span> : <button onClick={onClose} className="flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f0c681]"><ArrowLeft className="size-4" />All stories</button>}
            <div className="max-w-4xl pb-8">
              <div className="mb-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#e9ddc7]"><span className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0" /><InlineText value={canvas.dateRange} onChange={(value) => updateCanvas("dateRange", value)} editing={editing} label="story date" maxLength={100} singleLine className="min-w-24" /></span>{editing || canvas.location ? <span className="flex items-center gap-2"><MapPin className="size-4 shrink-0" /><InlineText value={canvas.location} onChange={(value) => updateCanvas("location", value)} editing={editing} label="place or route" maxLength={100} singleLine className="min-w-24" /></span> : null}<span className="flex items-center gap-2"><Sparkles className="size-4" />{storyStyleNames[story.style]} · {story.styleSource === "ai" ? "AI suggested" : story.styleSource === "manual" ? "Chosen by you" : "Auto selected"}</span></div>
              {editing ? <div className="mb-6 grid w-full max-w-md grid-cols-3 gap-1 rounded-[18px] border border-white/15 bg-black/20 p-1">{(["classic", "scrapbook", "cinematic"] as const).map((theme) => <button key={theme} type="button" disabled={changeTheme.isPending} onClick={() => changeTheme.mutate(theme)} className={cn("min-w-0 rounded-[14px] px-1.5 py-2 text-[9px] font-bold uppercase tracking-[.08em] transition sm:px-3 sm:text-[10px]", story.style === theme ? "bg-[#f0c681] text-[#26372f]" : "text-white/65 hover:text-white")}>{storyStyleNames[theme]}</button>)}</div> : null}
              <InlineText value={canvas.title} onChange={(value) => updateCanvas("title", value)} editing={editing} label="story title" maxLength={100} singleLine className="story-reveal-title font-display text-[clamp(3.15rem,14vw,10rem)] leading-[.82] tracking-[-.06em]" />
              <InlineText value={canvas.opening} onChange={(value) => updateCanvas("opening", value)} editing={editing} label="story opening" maxLength={1200} className="mt-6 max-w-2xl whitespace-pre-wrap text-base leading-7 text-[#eee4d6] sm:mt-8 sm:text-xl sm:leading-9" />
            </div>
          </div>
        </header>
        <StoryMoments story={story} moments={moments} canvas={canvas} editing={editing} onMomentChange={updateMoment} onBlueprintChange={updateBlueprint} />
        <div className="mx-auto max-w-[86rem] px-5 pb-20 sm:px-8 lg:pb-28">
          <footer className="mt-28 border-t border-[#d4c6b3] pt-10 text-center"><BookOpen className="mx-auto size-8 text-[#a9503f]" /><p className="mx-auto mt-5 max-w-xl font-display text-3xl italic">The files are stored. The story is what stays.</p>{canEdit && !editing ? <Button variant="secondary" className="mt-8" onClick={() => setEditing(true)}><PencilLine className="size-4" />Edit on the canvas</Button> : null}{!editing ? <Button className="mt-8" onClick={() => setShareOpen(true)}><Share2 className="size-4" />Share this story</Button> : null}{canDelete && !editing ? <Button variant="ghost" className="mt-8 text-[#9f3f31]" onClick={() => onDelete(story)}><Trash2 className="size-4" />Delete story</Button> : null}</footer>
        </div>
      </article>
      <SocialShareDialog story={story} objects={objects} open={shareOpen} onClose={() => setShareOpen(false)} />
      <StoryHistoryDialog open={historyOpen} story={story} currentCanvas={canvas} onClose={() => setHistoryOpen(false)} onRestored={restored} />
    </>
  );
}
