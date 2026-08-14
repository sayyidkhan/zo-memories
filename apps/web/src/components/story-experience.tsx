import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, Cloud, FileText, Film, History, ImagePlus, MapPin, PencilLine, RotateCcw, Share2, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { MomentObject, Story, StoryCanvas, StoryCanvasMoment, StoryRevision, StoryStyle, StoryStylePreference, StoryStyleSource } from "@zo-moments/types";
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

function StoryCover({ story, objects, onOpen }: { story: Story; objects: MomentObject[]; onOpen: () => void }) {
  const moments = storyMoments(story, objects);
  const photos = moments.filter((object) => object.kind === "photo").slice(0, 3);
  const formatLabel = story.styleSource === "auto" ? `Auto · ${storyStyleNames[story.style]}` : storyStyleNames[story.style];
  return (
    <button onClick={onOpen} className="story-cover group relative min-h-[28rem] overflow-hidden rounded-[32px] bg-[#183128] text-left text-[#fff9ee] shadow-[0_30px_75px_rgba(37,47,39,.18)]">
      <div className="absolute inset-0 grid grid-cols-[1.45fr_.75fr] gap-1 bg-[#344b40]">
        {photos[0] ? <img src={api.objectContentUrl(photos[0].spaceId, photos[0].id)} alt="" className="size-full object-cover transition duration-1000 group-hover:scale-[1.025]" /> : <div className="bg-[#415a4c]" />}
        <div className="grid grid-rows-2 gap-1">
          {photos.slice(1, 3).map((photo) => <img key={photo.id} src={api.objectContentUrl(photo.spaceId, photo.id)} alt="" className="size-full object-cover transition duration-1000 group-hover:scale-[1.04]" />)}
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,27,20,.9)_0%,rgba(10,27,20,.48)_48%,rgba(10,27,20,.12)_100%),linear-gradient(0deg,rgba(10,27,20,.72),transparent_60%)]" />
      <div className="relative flex min-h-[28rem] max-w-2xl flex-col justify-between p-7 sm:p-10 lg:p-12">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#f0c681]"><Sparkles className="size-4" />{formatLabel} · {moments.length} moments</div>
        <div>
          {story.location ? <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-[#e9ddc7]"><MapPin className="size-4" />{story.location}</p> : null}
          <h2 className="max-w-xl font-display text-[clamp(3rem,6vw,6.3rem)] leading-[.88] tracking-[-.055em]">{story.title}</h2>
          <p className="mt-5 max-w-lg line-clamp-2 text-sm leading-6 text-[#e7dfd2] sm:text-base">{story.opening}</p>
          <span className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#fff8ec] px-5 py-3 text-sm font-bold text-[#26372f] shadow-lg transition group-hover:translate-x-1">Read the story <ArrowRight className="size-4" /></span>
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

function StoryMoments({ story, moments, canvas, editing, onMomentChange }: { story: Story; moments: MomentObject[]; canvas: StoryCanvas; editing: boolean; onMomentChange: (momentId: string, field: keyof Pick<StoryCanvasMoment, "title" | "meta">, value: string) => void }) {
  const canvasById = new Map(canvas.moments.map((moment) => [moment.momentId, moment]));
  const content = (moment: MomentObject) => canvasById.get(moment.id) ?? { momentId: moment.id, title: moment.caption || moment.name, meta: "" };
  const credit = (moment: MomentObject, className?: string) => {
    const value = content(moment);
    return <InlineText value={value.meta} onChange={(next) => onMomentChange(moment.id, "meta", next)} editing={editing} label="scene details" maxLength={200} singleLine className={cn("mt-4 text-[10px] font-bold uppercase tracking-[.16em] opacity-70", className)} />;
  };
  const title = (moment: MomentObject, className?: string) => {
    const value = content(moment);
    return <InlineText value={value.title} onChange={(next) => onMomentChange(moment.id, "title", next)} editing={editing} label="scene title" maxLength={200} singleLine className={className} />;
  };
  if (story.style === "scrapbook") {
    return <div className="paper-grid mx-auto max-w-[92rem] px-5 py-12 sm:px-10 sm:py-20 lg:py-28"><div className="columns-1 gap-10 md:columns-2 xl:columns-3">{moments.map((moment, index) => <section key={moment.id} className={cn("mb-8 break-inside-avoid bg-[#fffaf2] p-3 pb-6 shadow-[0_18px_45px_rgba(70,53,33,.17)] sm:mb-12", index % 3 === 0 ? "-rotate-1" : index % 3 === 1 ? "rotate-1" : "-rotate-[.35deg]")}><div className="aspect-[4/3] overflow-hidden bg-[#d8cbbb]"><StoryMomentMedia moment={moment} alt={content(moment).title} /></div><div className="px-3 pt-5"><span className="font-display text-4xl italic text-[#b1604c]">{String(index + 1).padStart(2, "0")}</span>{title(moment, "mt-2 font-display text-3xl leading-none")}{credit(moment, editing ? "text-[#51493e]" : undefined)}</div></section>)}</div></div>;
  }
  if (story.style === "cinematic") {
    return <div className="bg-[#101b16] text-[#fffaf2]">{moments.map((moment, index) => <section key={moment.id} className="relative min-h-[76dvh] overflow-hidden sm:min-h-[88vh]"><StoryMomentMedia moment={moment} alt={content(moment).title} className="absolute inset-0" /><div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,14,9,.92),rgba(5,14,9,.08)_68%),linear-gradient(90deg,rgba(5,14,9,.5),transparent_55%)]" /><div className="relative mx-auto flex min-h-[76dvh] max-w-[92rem] items-end px-5 py-10 sm:min-h-[88vh] sm:px-10 sm:py-14 lg:px-16 lg:py-20"><div className="max-w-3xl"><p className="font-display text-6xl italic text-[#f0c681]/70 sm:text-7xl">{String(index + 1).padStart(2, "0")}</p>{title(moment, "mt-3 font-display text-[clamp(2.75rem,12vw,7rem)] leading-[.88] tracking-[-.055em] sm:mt-4")}{credit(moment)}</div></div></section>)}</div>;
  }
  return <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-8 sm:py-20 lg:py-28"><div className="mb-12 flex items-center gap-4 sm:mb-20 sm:gap-5"><span className="font-display text-5xl italic text-[#b1604c] sm:text-6xl">01</span><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9a5747]">The moments, in order</p><p className="mt-1 text-sm text-[#756e64]">{moments.length} scenes in this story</p></div></div><div className="grid gap-16 sm:gap-24 lg:gap-36">{moments.map((moment, index) => { const reverse = index % 2 === 1; return <section key={moment.id} className={cn("story-reader-chapter grid items-center gap-5 sm:gap-8 lg:grid-cols-[1.25fr_.75fr] lg:gap-16", reverse && "lg:grid-cols-[.75fr_1.25fr]")}><div className={cn("overflow-hidden rounded-[22px] bg-[#d8cbbb] shadow-[0_24px_60px_rgba(55,45,32,.14)] sm:rounded-[28px] sm:shadow-[0_30px_80px_rgba(55,45,32,.16)]", reverse && "lg:order-2")}><StoryMomentMedia moment={moment} alt={content(moment).title} className="max-h-[72dvh] sm:max-h-[78vh]" /></div><div className={cn(reverse && "lg:order-1 lg:text-right")}><p className="font-display text-5xl italic text-[#cfb99b] sm:text-6xl">{String(index + 1).padStart(2, "0")}</p>{title(moment, "mt-2 font-display text-3xl leading-[1.02] tracking-[-.035em] sm:mt-4 sm:text-5xl")}{credit(moment, editing ? "text-[#51493e]" : undefined)}</div></section>; })}</div></div>;
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
    } else if (!open) {
      setSelected([]);
      setStyle("auto");
      setStyleSource("auto");
      setStyleRationale("");
      setTitle("");
      setLocation("");
      setOpening("");
    }
  }, [open, story, objects]);
  useEffect(() => {
    if (hasEnoughMoments) return;
    setStyle("auto");
    setStyleSource("auto");
    setStyleRationale("");
  }, [hasEnoughMoments]);
  const mutation = useMutation({
    mutationFn: (input: { title: string; location?: string; opening: string; momentIds: string[]; style: StoryStylePreference; styleSource: StoryStyleSource; styleRationale?: string }) => story ? api.updateStory(spaceId, story.id, input) : api.createStory(spaceId, input),
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
      toast.success(draft.source === "ai" ? "AI drafted an opening for you" : "A private opening draft is ready");
    },
  });
  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const momentIds = chronological.filter((object) => selected.includes(object.id)).map((object) => object.id);
    mutation.mutate({ title, opening, momentIds, style, styleSource, ...(styleRationale ? { styleRationale } : {}), ...(location.trim() ? { location: location.trim() } : {}) });
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
          <Field label="Story title"><Input name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The weekend the rain followed us" minLength={2} maxLength={100} required /></Field>
          <Field label="Place or route" hint="Optional"><Input name="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Kyoto · Spring 2026" maxLength={100} /></Field>
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">03 · Choose the experience</p><p className="mt-1 text-sm text-[#746d63]">{hasEnoughMoments ? "Control the outcome, or leave it on Auto." : "Choose at least two moments above to unlock the story formats."}</p></div><Button type="button" variant="secondary" disabled={!hasEnoughMoments || suggest.isPending} onClick={() => suggest.mutate(chronological.filter((object) => selected.includes(object.id)).map((object) => object.id))}>{suggest.isPending ? <><Spinner />AI is reviewing the sequence…</> : <><Sparkles className="size-4" />Ask AI to suggest</>}</Button></div>
          <button type="button" disabled={!hasEnoughMoments} onClick={() => { setStyle("auto"); setStyleSource("auto"); setStyleRationale(""); }} className={cn("mb-3 flex w-full items-center gap-4 rounded-[20px] border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50", style === "auto" ? "border-[#a9503f] bg-[#fff8ec] shadow-[0_10px_28px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f4ede1] hover:border-[#b9aa96]")}><span className={cn("grid size-10 shrink-0 place-items-center rounded-[14px]", style === "auto" ? "bg-[#a9503f] text-white" : "bg-[#e4d8c7] text-[#526158]")}><WandSparkles className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-[#26372f]">Choose for me</strong><span className="mt-1 block text-xs leading-5 text-[#7a7267]">Privately select the best fit from Classic, Scrapbook, or Cinematic.</span></span>{style === "auto" && hasEnoughMoments ? <Check className="size-4 shrink-0 text-[#a9503f]" /> : null}</button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((format) => <button key={format.id} type="button" disabled={!hasEnoughMoments} onClick={() => { setStyle(format.id); setStyleSource(format.id === "auto" ? "auto" : "manual"); setStyleRationale(""); }} className={cn("rounded-[20px] border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50", style === format.id ? "border-[#a9503f] bg-[#fff8ec] shadow-[0_10px_28px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f4ede1] hover:border-[#b9aa96]")}><div className="flex items-center justify-between"><span className={cn("grid size-10 place-items-center rounded-[14px]", style === format.id ? "bg-[#a9503f] text-white" : "bg-[#e4d8c7] text-[#526158]")}><format.icon className="size-4" /></span>{style === format.id && hasEnoughMoments ? <Check className="size-4 text-[#a9503f]" /> : null}</div><strong className="mt-3 block text-sm text-[#26372f]">{format.title}</strong><span className="mt-1 block text-xs leading-5 text-[#7a7267]">{format.description}</span></button>)}
          </div>
          {styleRationale ? <div className="mt-4 flex gap-3 rounded-[18px] border border-[#d5dfd5] bg-[#edf3ed] p-4 text-xs leading-5 text-[#526158]"><Sparkles className="mt-0.5 size-4 shrink-0 text-[#496151]" /><p><strong className="text-[#34443a]">AI suggests {formats.find((format) => format.id === style)?.title}.</strong> {styleRationale} You can still choose any other format.</p></div> : null}
          <p className="mt-3 text-[11px] leading-5 text-[#8a8277]">AI is optional. When used, Zo receives only filenames, captions, dates, and media types, not your photos or files.</p>
        </section>
        <section className="grid gap-4 rounded-[24px] bg-[#20372d] p-5 text-[#fff9ee]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">04 · Tell us why it mattered</p><p className="mt-2 text-sm leading-6 text-[#d8ddd8]">Write the opening only your people could write. The moments will carry the rest.</p></div><Button type="button" variant="secondary" className="shrink-0" disabled={!hasEnoughMoments || draftOpening.isPending} onClick={() => draftOpening.mutate(chronological.filter((object) => selected.includes(object.id)).map((object) => object.id))}>{draftOpening.isPending ? <><Spinner />Drafting…</> : <><WandSparkles className="size-4" />{opening.trim() ? "Rewrite with AI" : "Draft with AI"}</>}</Button></div>
          <textarea name="opening" value={opening} onChange={(event) => setOpening(event.target.value)} required minLength={10} maxLength={1200} rows={4} placeholder="It started before sunrise, with three coffees and no idea where the day would take us…" className="min-h-32 w-full resize-y rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/45 focus:border-[#f0c681]" />
          <p className="text-[11px] leading-5 text-[#bfc9c2]">AI uses only the selected filenames, captions, dates, and media types. Review and edit the draft before {story ? "saving" : "creating"} your story.</p>
        </section>
        {mutation.error ? <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{mutation.error instanceof ZoMomentsApiError ? mutation.error.message : `The story could not be ${story ? "updated" : "created"}`}</p> : null}
        <div className="sticky -bottom-4 z-20 -mx-4 border-t border-[#e2d7c8] bg-[#fffaf2]/96 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:static sm:m-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0"><Button className="w-full sm:w-auto" disabled={!hasEnoughMoments || mutation.isPending}>{mutation.isPending ? <Spinner /> : story ? <><PencilLine className="size-4" />Save changes</> : <><Sparkles className="size-4" />Create the story</>}</Button></div>
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

export function StoryReader({ story, objects, canEdit, canDelete, onClose, onStoryChanged, onDelete }: { story: Story | null; objects: MomentObject[]; canEdit: boolean; canDelete: boolean; onClose: () => void; onStoryChanged: (story: Story) => void; onDelete: (story: Story) => void }) {
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [canvas, setCanvas] = useState<StoryCanvas>({ title: "", location: "", dateRange: "", opening: "", moments: [] });
  const canvasRef = useRef(canvas);
  const savedCanvasRef = useRef("");
  const canvasSerialised = JSON.stringify(canvas);
  const canvasValid = canvas.title.trim().length >= 2 && canvas.opening.trim().length >= 10 && canvas.moments.every((moment) => moment.title.trim().length > 0);
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
      <article data-editing={editing || undefined} className="fixed inset-0 z-[60] overflow-y-auto bg-[#f3eadc] text-[#23372d]">
        <div className="fixed right-3 top-[max(.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-2 sm:right-4 sm:top-4">
          {editing ? <><span className={cn("inline-flex size-11 items-center justify-center rounded-full bg-[#183128]/88 text-[#fff9ee] shadow-xl backdrop-blur-md sm:hidden", saveCanvas.isError && "bg-[#8a372b]")} aria-label={saveLabel}>{saveCanvas.isPending ? <Spinner /> : <Cloud className="size-4" />}</span><span className={cn("hidden h-11 items-center gap-2 rounded-full bg-[#183128]/88 px-4 text-xs font-bold text-[#fff9ee] shadow-xl backdrop-blur-md sm:inline-flex", saveCanvas.isError && "bg-[#8a372b]")}>{saveCanvas.isPending ? <Spinner /> : <Cloud className="size-4" />}{saveLabel}</span><button onClick={() => setHistoryOpen(true)} className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-[#fff9ee]/94 text-sm font-bold text-[#26372f] shadow-xl backdrop-blur-md sm:h-12 sm:w-auto sm:px-5" aria-label="Version history"><History className="size-4" /><span className="hidden sm:inline">Versions</span></button><button onClick={finishEditing} disabled={!canvasValid || saveCanvas.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#f0c681] px-4 text-sm font-bold text-[#26372f] shadow-xl transition hover:bg-[#f6d795] disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:px-5"><Check className="size-4" />Done</button></> : <>{canEdit ? <button onClick={() => setEditing(true)} className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-[#fff9ee]/90 text-sm font-bold text-[#26372f] shadow-xl backdrop-blur-md transition hover:scale-[1.03] sm:h-12 sm:w-auto sm:px-5" aria-label="Edit story"><PencilLine className="size-4" /><span className="hidden sm:inline">Edit</span></button> : null}<button onClick={() => setShareOpen(true)} className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-[#f0c681] text-sm font-bold text-[#26372f] shadow-xl backdrop-blur-md transition hover:scale-[1.03] hover:bg-[#f6d795] sm:h-12 sm:w-auto sm:px-5" aria-label="Share story"><Share2 className="size-4" /><span className="hidden sm:inline">Share story</span></button><button onClick={onClose} className="grid size-11 place-items-center rounded-full bg-[#fff9ee]/90 shadow-xl backdrop-blur-md transition hover:scale-105 sm:size-12" aria-label="Close story"><X className="size-5" /></button></>}
        </div>
        <header className="relative min-h-[76dvh] overflow-hidden bg-[#183128] text-[#fff9ee] sm:min-h-[88vh]">
          {hero ? <img src={api.objectContentUrl(hero.spaceId, hero.id)} alt="" className="absolute inset-0 size-full object-cover" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,26,19,.96),rgba(9,26,19,.47)_60%,rgba(9,26,19,.18)),linear-gradient(0deg,rgba(9,26,19,.74),transparent_58%)]" />
          <div className="relative mx-auto flex min-h-[76dvh] max-w-[92rem] flex-col justify-between px-5 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))] sm:min-h-[88vh] sm:px-10 sm:py-10 lg:px-16 lg:py-14">
            {editing ? <span className="flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f0c681]"><PencilLine className="size-4" />Tap any outlined text to edit</span> : <button onClick={onClose} className="flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f0c681]"><ArrowLeft className="size-4" />All stories</button>}
            <div className="max-w-4xl pb-8">
              <div className="mb-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#e9ddc7]"><span className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0" /><InlineText value={canvas.dateRange} onChange={(value) => updateCanvas("dateRange", value)} editing={editing} label="story date" maxLength={100} singleLine className="min-w-24" /></span>{editing || canvas.location ? <span className="flex items-center gap-2"><MapPin className="size-4 shrink-0" /><InlineText value={canvas.location} onChange={(value) => updateCanvas("location", value)} editing={editing} label="place or route" maxLength={100} singleLine className="min-w-24" /></span> : null}<span className="flex items-center gap-2"><Sparkles className="size-4" />{storyStyleNames[story.style]} · {story.styleSource === "ai" ? "AI suggested" : story.styleSource === "manual" ? "Chosen by you" : "Auto selected"}</span></div>
              <InlineText value={canvas.title} onChange={(value) => updateCanvas("title", value)} editing={editing} label="story title" maxLength={100} singleLine className="font-display text-[clamp(3.15rem,14vw,10rem)] leading-[.82] tracking-[-.06em]" />
              <InlineText value={canvas.opening} onChange={(value) => updateCanvas("opening", value)} editing={editing} label="story opening" maxLength={1200} className="mt-6 max-w-2xl whitespace-pre-wrap text-base leading-7 text-[#eee4d6] sm:mt-8 sm:text-xl sm:leading-9" />
            </div>
          </div>
        </header>
        <StoryMoments story={story} moments={moments} canvas={canvas} editing={editing} onMomentChange={updateMoment} />
        <div className="mx-auto max-w-[86rem] px-5 pb-20 sm:px-8 lg:pb-28">
          <footer className="mt-28 border-t border-[#d4c6b3] pt-10 text-center"><BookOpen className="mx-auto size-8 text-[#a9503f]" /><p className="mx-auto mt-5 max-w-xl font-display text-3xl italic">The files are stored. The story is what stays.</p>{canEdit && !editing ? <Button variant="secondary" className="mt-8" onClick={() => setEditing(true)}><PencilLine className="size-4" />Edit on the canvas</Button> : null}{!editing ? <Button className="mt-8" onClick={() => setShareOpen(true)}><Share2 className="size-4" />Share this story</Button> : null}{canDelete && !editing ? <Button variant="ghost" className="mt-8 text-[#9f3f31]" onClick={() => onDelete(story)}><Trash2 className="size-4" />Delete story</Button> : null}</footer>
        </div>
      </article>
      <SocialShareDialog story={story} objects={objects} open={shareOpen} onClose={() => setShareOpen(false)} />
      <StoryHistoryDialog open={historyOpen} story={story} currentCanvas={canvas} onClose={() => setHistoryOpen(false)} onRestored={restored} />
    </>
  );
}
