import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, FileText, Film, History, ImagePlus, MapPin, Pencil, RotateCcw, Share2, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { Member, MomentObject, Story, StoryBlueprint, StoryChapter, StoryStyle, StoryStylePreference, StoryStyleSource } from "@zo-moments/types";
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

function StoryMomentMedia({ moment, className }: { moment: MomentObject; className?: string }) {
  return moment.kind === "photo"
    ? <img src={api.objectContentUrl(moment.spaceId, moment.id)} alt={moment.caption || moment.name} className={cn("size-full object-cover", className)} />
    : <div className={cn("grid min-h-80 place-items-center bg-[#26372f] text-[#f0c681]", className)}><FileText className="size-14" /></div>;
}

function MomentCredit({ moment, member }: { moment: MomentObject; member?: Member | undefined }) {
  return <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] opacity-70">{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(moment.occurredAt))}{member ? ` · ${member.name}` : ""}</p>;
}

function EditableText({ value, editing, className, multiline = false, onChange }: { value: string; editing: boolean; className: string; multiline?: boolean; onChange: (value: string) => void }) {
  if (!editing) return multiline ? <p className={className}>{value}</p> : <h2 className={className}>{value}</h2>;
  return (
    <div
      className={cn(className, "story-inline-editor rounded-lg outline-none ring-[#f0c681] focus:ring-2")}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      onInput={(event) => onChange(event.currentTarget.textContent ?? "")}
    >
      {value}
    </div>
  );
}

function chapterMoments(chapter: StoryChapter, objects: MomentObject[]) {
  const byId = new Map(objects.map((object) => [object.id, object]));
  return chapter.momentIds.map((id) => byId.get(id)).filter((object): object is MomentObject => Boolean(object));
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

function StoryMoments({ story, moments, members, editing, onChapterChange }: { story: Story; moments: MomentObject[]; members: Member[]; editing: boolean; onChapterChange: (chapterId: string, field: "title" | "narration", value: string) => void }) {
  const chapters = story.blueprint?.chapters ?? [];
  if (story.style === "scrapbook") return (
    <div className="paper-grid mx-auto max-w-[92rem] px-5 py-12 sm:px-10 sm:py-20 lg:py-28">
      <div className="grid gap-14 lg:grid-cols-2">
        {chapters.map((chapter, index) => {
          const chapterObjects = chapterMoments(chapter, moments);
          return <section key={chapter.id} className={cn("relative bg-[#fffaf2] p-4 pb-8 shadow-[0_22px_55px_rgba(70,53,33,.17)] sm:p-6", index % 2 ? "rotate-[.5deg]" : "-rotate-[.5deg]")}>
            <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[-2deg] bg-[#d9bd8f]/70" />
            <div className="grid grid-cols-2 gap-2">{chapterObjects.map((moment, momentIndex) => <div key={moment.id} className={cn("overflow-hidden bg-[#d8cbbb]", momentIndex === 0 && chapterObjects.length % 2 === 1 ? "col-span-2 aspect-[16/10]" : "aspect-square")}><StoryMomentMedia moment={moment} /></div>)}</div>
            <div className="px-2 pt-6"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">Chapter {String(index + 1).padStart(2, "0")} · {chapter.beat.replace("-", " ")}</p><EditableText value={chapter.title} editing={editing} onChange={(value) => onChapterChange(chapter.id, "title", value)} className="mt-3 font-display text-4xl leading-[.95]" /><EditableText value={chapter.narration} editing={editing} multiline onChange={(value) => onChapterChange(chapter.id, "narration", value)} className="mt-4 text-sm leading-7 text-[#665e54]" /></div>
          </section>;
        })}
      </div>
    </div>
  );
  if (story.style === "cinematic") return (
    <div className="bg-[#101b16] text-[#fffaf2]">
      {chapters.map((chapter, index) => {
        const chapterObjects = chapterMoments(chapter, moments);
        const hero = chapterObjects.find((moment) => moment.kind === "photo") ?? chapterObjects[0];
        return <section key={chapter.id} className="relative min-h-[78dvh] overflow-hidden sm:min-h-[92vh]">
          {hero ? <StoryMomentMedia moment={hero} className="absolute inset-0" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,14,9,.96),rgba(5,14,9,.12)_72%),linear-gradient(90deg,rgba(5,14,9,.58),transparent_62%)]" />
          <div className="relative mx-auto flex min-h-[78dvh] max-w-[92rem] flex-col justify-end px-5 py-10 sm:min-h-[92vh] sm:px-10 sm:py-14 lg:px-16 lg:py-20">
            <p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#f0c681]">Scene {String(index + 1).padStart(2, "0")} · {chapter.beat.replace("-", " ")}</p>
            <EditableText value={chapter.title} editing={editing} onChange={(value) => onChapterChange(chapter.id, "title", value)} className="mt-3 max-w-4xl font-display text-[clamp(3rem,12vw,7rem)] leading-[.86] tracking-[-.055em]" />
            <EditableText value={chapter.narration} editing={editing} multiline onChange={(value) => onChapterChange(chapter.id, "narration", value)} className="mt-6 max-w-2xl text-base leading-8 text-[#e8dfd2] sm:text-xl sm:leading-9" />
            <div className="mt-7 flex gap-2 overflow-x-auto pb-1 no-scrollbar">{chapterObjects.slice(1).map((moment) => <div key={moment.id} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/20 sm:h-24 sm:w-24"><StoryMomentMedia moment={moment} /></div>)}</div>
          </div>
        </section>;
      })}
    </div>
  );
  return (
    <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-8 sm:py-20 lg:py-28">
      <div className="grid gap-20 sm:gap-28">{chapters.map((chapter, index) => {
        const chapterObjects = chapterMoments(chapter, moments);
        return <section key={chapter.id} className="story-reader-chapter">
          <div className="mb-7 max-w-3xl sm:mb-10"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a9503f]">Chapter {String(index + 1).padStart(2, "0")} · {chapter.beat.replace("-", " ")}</p><EditableText value={chapter.title} editing={editing} onChange={(value) => onChapterChange(chapter.id, "title", value)} className="mt-3 font-display text-4xl leading-[.95] tracking-[-.035em] sm:text-6xl" /><EditableText value={chapter.narration} editing={editing} multiline onChange={(value) => onChapterChange(chapter.id, "narration", value)} className="mt-5 max-w-2xl text-base leading-8 text-[#665e54] sm:text-lg" /></div>
          <div className={cn("grid gap-3", chapterObjects.length > 1 && "grid-cols-2", chapterObjects.length > 3 && "sm:grid-cols-3")}>
            {chapterObjects.map((moment, momentIndex) => <figure key={moment.id} className={cn("overflow-hidden rounded-[20px] bg-[#d8cbbb] shadow-[0_20px_55px_rgba(55,45,32,.13)]", momentIndex === 0 && chapterObjects.length > 2 && "col-span-2 row-span-2")}><div className="aspect-[4/3]"><StoryMomentMedia moment={moment} /></div><figcaption className="bg-[#fff8ec] px-4 py-4"><p className="text-sm font-semibold">{moment.caption || moment.name}</p><MomentCredit moment={moment} member={members.find((member) => member.userId === moment.uploadedBy)} /></figcaption></figure>)}
          </div>
        </section>;
      })}</div>
    </div>
  );
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
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#a9503f]">Demo storybook themes</p>
          <div className="mt-3 max-w-3xl">
            <h2 className="font-display text-4xl leading-[.95] tracking-[-.04em] text-[#26372f] sm:text-5xl">One journey, three distinct moods.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#71695f]">The story remains intact while its theme changes from an editorial journal to a tactile keepsake or an immersive journey.</p>
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

export function StoryDialog({ open, onClose, spaceId, objects, onCreated }: { open: boolean; onClose: () => void; spaceId: string; objects: MomentObject[]; onCreated: (story: Story) => void }) {
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
  useEffect(() => { if (!open) { setSelected([]); setStyle("auto"); setStyleSource("auto"); setStyleRationale(""); setTitle(""); setLocation(""); setOpening(""); setBlueprint(null); } }, [open]);
  const mutation = useMutation({
    mutationFn: (input: { title: string; location?: string; opening: string; momentIds: string[]; style: StoryStylePreference; styleSource: StoryStyleSource; styleRationale?: string; blueprint?: StoryBlueprint }) => api.createStory(spaceId, input),
    onSuccess: async ({ story }) => {
      await queryClient.invalidateQueries({ queryKey: ["stories", spaceId] });
      toast.success("Your story is ready to read");
      onCreated(story);
      onClose();
    },
  });
  const suggest = useMutation({
    mutationFn: (momentIds: string[]) => api.suggestStoryStyle(spaceId, { momentIds }),
    onSuccess: (suggestion) => {
      setStyle(suggestion.style === "flipbook" || suggestion.style === "comic" ? "classic" : suggestion.style);
      setStyleSource(suggestion.source);
      setStyleRationale(suggestion.rationale);
      toast.success(suggestion.source === "ai" ? "AI suggested a story theme" : "A private theme suggestion is ready");
    },
  });
  const draft = useMutation({
    mutationFn: async () => {
      const momentIds = chronological.filter((object) => selected.includes(object.id)).map((object) => object.id);
      let nextOpening = opening.trim();
      if (nextOpening.length < 10) {
        const suggestion = await api.suggestStoryOpening(spaceId, { title: title.trim() || undefined, location: location.trim() || undefined, momentIds });
        nextOpening = suggestion.opening;
      }
      const result = await api.suggestStoryBlueprint(spaceId, { title: title.trim() || undefined, location: location.trim() || undefined, opening: nextOpening, momentIds });
      return { ...result, opening: nextOpening };
    },
    onSuccess: (result) => {
      setOpening(result.opening);
      setBlueprint(result.blueprint);
      toast.success(result.source === "ai" ? "AI shaped the journey into chapters" : "A private chapter draft is ready");
    },
  });
  function toggle(id: string) {
    setBlueprint(null);
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const momentIds = chronological.filter((object) => selected.includes(object.id)).map((object) => object.id);
    mutation.mutate({ title: title.trim(), opening: opening.trim(), momentIds, style, styleSource, ...(styleRationale ? { styleRationale } : {}), ...(location.trim() ? { location: location.trim() } : {}), ...(blueprint ? { blueprint } : {}) });
  }
  const formats: Array<{ id: StoryStylePreference; title: string; description: string; icon: typeof BookOpen }> = [
    { id: "classic", title: "Classic", description: "Timeless editorial chapters with generous space.", icon: BookOpen },
    { id: "scrapbook", title: "Scrapbook", description: "Layered keepsakes, notes, and tactile details.", icon: ImagePlus },
    { id: "cinematic", title: "Cinematic", description: "Immersive full-bleed scenes for bigger journeys.", icon: Film },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Craft a story" description="Give the moments their meaning. Your selections will read from oldest to newest." size="xl">
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">03 · Choose the theme</p><p className="mt-1 text-sm text-[#746d63]">Change the visual mood without changing the story.</p></div><Button type="button" variant="secondary" disabled={selected.length < 2 || suggest.isPending} onClick={() => suggest.mutate(chronological.filter((object) => selected.includes(object.id)).map((object) => object.id))}>{suggest.isPending ? <><Spinner />AI is reviewing the sequence…</> : <><Sparkles className="size-4" />Ask AI to suggest</>}</Button></div>
          <button type="button" onClick={() => { setStyle("auto"); setStyleSource("auto"); setStyleRationale(""); }} className={cn("mb-3 flex w-full items-center gap-4 rounded-[20px] border-2 p-4 text-left transition", style === "auto" ? "border-[#a9503f] bg-[#fff8ec] shadow-[0_10px_28px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f4ede1] hover:border-[#b9aa96]")}><span className={cn("grid size-10 shrink-0 place-items-center rounded-[14px]", style === "auto" ? "bg-[#a9503f] text-white" : "bg-[#e4d8c7] text-[#526158]")}><WandSparkles className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-[#26372f]">Choose for me</strong><span className="mt-1 block text-xs leading-5 text-[#7a7267]">Privately select the best fit from Classic, Scrapbook, or Cinematic.</span></span>{style === "auto" ? <Check className="size-4 shrink-0 text-[#a9503f]" /> : null}</button>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((format) => <button key={format.id} type="button" onClick={() => { setStyle(format.id); setStyleSource(format.id === "auto" ? "auto" : "manual"); setStyleRationale(""); }} className={cn("rounded-[20px] border-2 p-4 text-left transition", style === format.id ? "border-[#a9503f] bg-[#fff8ec] shadow-[0_10px_28px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f4ede1] hover:border-[#b9aa96]")}><div className="flex items-center justify-between"><span className={cn("grid size-10 place-items-center rounded-[14px]", style === format.id ? "bg-[#a9503f] text-white" : "bg-[#e4d8c7] text-[#526158]")}><format.icon className="size-4" /></span>{style === format.id ? <Check className="size-4 text-[#a9503f]" /> : null}</div><strong className="mt-3 block text-sm text-[#26372f]">{format.title}</strong><span className="mt-1 block text-xs leading-5 text-[#7a7267]">{format.description}</span></button>)}
          </div>
          {styleRationale ? <div className="mt-4 flex gap-3 rounded-[18px] border border-[#d5dfd5] bg-[#edf3ed] p-4 text-xs leading-5 text-[#526158]"><Sparkles className="mt-0.5 size-4 shrink-0 text-[#496151]" /><p><strong className="text-[#34443a]">AI suggests {formats.find((format) => format.id === style)?.title}.</strong> {styleRationale} You can still choose any other format.</p></div> : null}
          <p className="mt-3 text-[11px] leading-5 text-[#8a8277]">The theme can be changed later. AI is optional and receives only filenames, captions, dates, and media types, not your photos or files.</p>
        </section>
        <section className="grid gap-4 rounded-[24px] bg-[#20372d] p-5 text-[#fff9ee]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">04 · Shape the journey</p><p className="mt-2 text-sm leading-6 text-[#d8ddd8]">Add the context only your people know, then let AI organise it into editable chapters.</p></div><Button type="button" variant="secondary" disabled={selected.length < 2 || draft.isPending} onClick={() => draft.mutate()}>{draft.isPending ? <><Spinner />Writing the chapters…</> : <><WandSparkles className="size-4" />Draft the full story</>}</Button></div>
          <textarea name="opening" value={opening} onChange={(event) => { setOpening(event.target.value); setBlueprint(null); }} required minLength={10} maxLength={1200} rows={4} placeholder="Write why this experience mattered, or leave it blank and ask AI to draft from the moment details…" className="min-h-32 w-full resize-y rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/45 focus:border-[#f0c681]" />
          {blueprint ? <div className="rounded-[18px] border border-white/15 bg-white/8 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-[#f0c681]">Journey blueprint ready</p><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em]">{blueprint.chapters.length} chapters</span></div><div className="mt-3 grid gap-2">{blueprint.chapters.map((chapter, index) => <div key={chapter.id} className="flex items-center gap-3 rounded-xl bg-black/10 px-3 py-2"><span className="font-display text-xl italic text-[#f0c681]">{String(index + 1).padStart(2, "0")}</span><div><strong className="block text-xs">{chapter.title}</strong><span className="text-[10px] text-white/55">{chapter.momentIds.length} {chapter.momentIds.length === 1 ? "moment" : "moments"} · {chapter.beat.replace("-", " ")}</span></div></div>)}</div></div> : null}
        </section>
        {mutation.error ? <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{mutation.error instanceof ZoMomentsApiError ? mutation.error.message : "The story could not be created"}</p> : null}
        <div className="sticky -bottom-4 z-20 -mx-4 border-t border-[#e2d7c8] bg-[#fffaf2]/96 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:static sm:m-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0"><Button className="w-full sm:w-auto" disabled={selected.length < 2 || title.trim().length < 2 || opening.trim().length < 10 || mutation.isPending || draft.isPending}>{mutation.isPending ? <Spinner /> : <><Sparkles className="size-4" />Create the storybook</>}</Button></div>
      </form>
    </Modal>
  );
}

export function StoryReader({ story, objects, members, canEdit, canDelete, onClose, onDelete, onUpdated }: { story: Story | null; objects: MomentObject[]; members: Member[]; canEdit: boolean; canDelete: boolean; onClose: () => void; onDelete: (story: Story) => void; onUpdated: (story: Story) => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [draftStory, setDraftStory] = useState<Story | null>(story);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useMutation({
    mutationFn: (next: Story) => api.updateStory(next.spaceId, next.id, { title: next.title, location: next.location, opening: next.blueprint?.summary ?? next.opening, blueprint: next.blueprint!, style: next.style === "flipbook" || next.style === "comic" ? "classic" : next.style }),
    onSuccess: ({ story: updated }) => { setDraftStory(updated); onUpdated(updated); },
    onError: () => toast.error("The latest story edit could not be saved"),
  });
  const restore = useMutation({
    mutationFn: (revisionId: string) => api.restoreStoryRevision(story!.spaceId, story!.id, revisionId),
    onSuccess: ({ story: updated }) => { setDraftStory(updated); onUpdated(updated); setVersionsOpen(false); toast.success("Earlier story version restored"); },
  });
  function scheduleSave(next: Story) {
    setDraftStory(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (next.title.trim().length < 2 || !next.blueprint || next.blueprint.summary.trim().length < 10 || next.blueprint.closing.trim().length < 10 || next.blueprint.chapters.some((chapter) => chapter.title.trim().length < 1 || chapter.narration.trim().length < 1)) return;
    saveTimer.current = setTimeout(() => save.mutate(next), 700);
  }
  function updateBlueprint(update: (blueprint: StoryBlueprint) => StoryBlueprint) {
    if (!draftStory?.blueprint) return;
    scheduleSave({ ...draftStory, blueprint: update(draftStory.blueprint) });
  }
  function updateChapter(chapterId: string, field: "title" | "narration", value: string) {
    updateBlueprint((blueprint) => ({ ...blueprint, chapters: blueprint.chapters.map((chapter) => chapter.id === chapterId ? { ...chapter, [field]: value } : chapter) }));
  }
  useEffect(() => {
    if (!story) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !shareOpen && !versionsOpen) onClose(); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", close); };
  }, [onClose, shareOpen, story, versionsOpen]);
  useEffect(() => { setShareOpen(false); setEditing(false); setVersionsOpen(false); setDraftStory(story); }, [story?.id]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  if (!story || !draftStory) return null;
  const displayedStory = draftStory;
  const moments = storyMoments(displayedStory, objects);
  const hero = moments.find((object) => object.kind === "photo");
  return (
    <>
      <article className="fixed inset-0 z-[60] overflow-y-auto bg-[#f3eadc] text-[#23372d]">
        <div className="fixed right-3 top-[max(.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-1.5 sm:right-4 sm:top-4">
          {canEdit ? <button onClick={() => setVersionsOpen(true)} className="grid size-11 place-items-center rounded-full bg-[#fff9ee]/90 text-[#26372f] shadow-xl backdrop-blur-md transition hover:scale-105" aria-label="Story versions"><History className="size-4" /></button> : null}
          {canEdit ? <button onClick={() => setEditing((value) => !value)} className={cn("inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-bold shadow-xl backdrop-blur-md transition hover:scale-[1.03]", editing ? "bg-[#dce8dc] text-[#26372f]" : "bg-[#fff9ee]/90 text-[#26372f]")} aria-label="Edit story"><Pencil className="size-4" /><span className="hidden sm:inline">{save.isPending ? "Saving…" : editing ? "Editing" : "Edit"}</span></button> : null}
          <button onClick={() => setShareOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f0c681] px-3 text-sm font-bold text-[#26372f] shadow-xl backdrop-blur-md transition hover:scale-[1.03] hover:bg-[#f6d795]" aria-label="Share story"><Share2 className="size-4" /><span className="hidden sm:inline">Share</span></button>
          <button onClick={onClose} className="grid size-11 place-items-center rounded-full bg-[#fff9ee]/90 shadow-xl backdrop-blur-md transition hover:scale-105" aria-label="Close story"><X className="size-5" /></button>
        </div>
        <header className="relative min-h-[76dvh] overflow-hidden bg-[#183128] text-[#fff9ee] sm:min-h-[88vh]">
          {hero ? <img src={api.objectContentUrl(hero.spaceId, hero.id)} alt="" className="absolute inset-0 size-full object-cover" /> : null}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,26,19,.96),rgba(9,26,19,.47)_60%,rgba(9,26,19,.18)),linear-gradient(0deg,rgba(9,26,19,.74),transparent_58%)]" />
          <div className="relative mx-auto flex min-h-[76dvh] max-w-[92rem] flex-col justify-between px-5 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))] sm:min-h-[88vh] sm:px-10 sm:py-10 lg:px-16 lg:py-14">
            <button onClick={onClose} className="flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f0c681]"><ArrowLeft className="size-4" />All stories</button>
            <div className="max-w-4xl pb-8">
              <div className="mb-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#e9ddc7]"><span className="flex items-center gap-2"><CalendarDays className="size-4" />{storyDateRange(moments)}</span>{displayedStory.location ? <span className="flex items-center gap-2"><MapPin className="size-4" />{displayedStory.location}</span> : null}<span className="flex items-center gap-2"><Sparkles className="size-4" />{storyStyleNames[displayedStory.style]} · {displayedStory.blueprint?.chapters.length ?? 0} chapters</span></div>
              {editing ? <div className="mb-5 grid w-full max-w-md grid-cols-3 gap-1 rounded-[18px] border border-white/15 bg-black/20 p-1">{(["classic", "scrapbook", "cinematic"] as const).map((theme) => <button key={theme} onClick={() => scheduleSave({ ...displayedStory, style: theme, styleSource: "manual", styleRationale: null })} className={cn("min-w-0 rounded-[14px] px-1.5 py-2 text-[9px] font-bold uppercase tracking-[.08em] transition sm:px-3 sm:text-[10px] sm:tracking-[.12em]", displayedStory.style === theme ? "bg-[#f0c681] text-[#26372f]" : "text-white/65 hover:text-white")}>{storyStyleNames[theme]}</button>)}</div> : null}
              {editing ? <input value={displayedStory.location ?? ""} onChange={(event) => scheduleSave({ ...displayedStory, location: event.target.value || null })} placeholder="Place or route" className="mb-5 h-11 w-full max-w-sm rounded-xl border border-white/20 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#f0c681]" /> : null}
              <EditableText value={displayedStory.title} editing={editing} onChange={(value) => scheduleSave({ ...displayedStory, title: value })} className="font-display text-[clamp(3.15rem,14vw,10rem)] leading-[.82] tracking-[-.06em]" />
              <EditableText value={displayedStory.blueprint?.summary ?? displayedStory.opening} editing={editing} multiline onChange={(value) => updateBlueprint((blueprint) => ({ ...blueprint, summary: value }))} className="mt-6 max-w-2xl text-base leading-7 text-[#eee4d6] sm:mt-8 sm:text-xl sm:leading-9" />
              {editing ? <p className="mt-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#f0c681]">Tap any highlighted text to rewrite it · autosaves after you pause</p> : null}
            </div>
          </div>
        </header>
        <StoryMoments story={displayedStory} moments={moments} members={members} editing={editing} onChapterChange={updateChapter} />
        <div className="mx-auto max-w-[86rem] px-5 pb-20 sm:px-8 lg:pb-28">
          <footer className="mt-28 border-t border-[#d4c6b3] pt-10 text-center"><BookOpen className="mx-auto size-8 text-[#a9503f]" /><EditableText value={displayedStory.blueprint?.closing ?? "The files are stored. The story is what stays."} editing={editing} multiline onChange={(value) => updateBlueprint((blueprint) => ({ ...blueprint, closing: value }))} className="mx-auto mt-5 max-w-xl font-display text-3xl italic" /><Button className="mt-8" onClick={() => setShareOpen(true)}><Share2 className="size-4" />Share this story</Button>{canDelete ? <Button variant="ghost" className="mt-8 text-[#9f3f31]" onClick={() => onDelete(displayedStory)}><Trash2 className="size-4" />Delete story</Button> : null}</footer>
        </div>
      </article>
      <SocialShareDialog story={displayedStory} objects={objects} open={shareOpen} onClose={() => setShareOpen(false)} />
      <Modal open={versionsOpen} onClose={() => setVersionsOpen(false)} title="Story versions" description="Every saved edit keeps the previous story so you can return to it." size="lg">
        <div className="grid gap-3">{displayedStory.revisions?.length ? displayedStory.revisions.map((revision, index) => <div key={revision.id} className="flex items-center justify-between gap-4 rounded-[18px] border border-[#ded3c3] bg-[#fff8ec] p-4"><div><strong className="block text-sm text-[#26372f]">{revision.title}</strong><span className="mt-1 block text-xs text-[#7a7267]">{index === 0 ? "Previous version" : `Version ${displayedStory.revisions!.length - index}`} · {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.savedAt))}</span></div><Button variant="secondary" disabled={restore.isPending} onClick={() => restore.mutate(revision.id)}><RotateCcw className="size-4" />Restore</Button></div>) : <p className="rounded-[18px] bg-[#f3ebdf] p-5 text-sm text-[#71695f]">The first earlier version appears after you edit this story.</p>}</div>
      </Modal>
    </>
  );
}
