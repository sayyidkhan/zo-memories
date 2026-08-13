import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, FileText, Film, ImagePlus, Images, LayoutGrid, MapPin, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { Member, MomentObject, Story, StoryStyle, StoryStylePreference, StoryStyleSource } from "@zo-moments/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#f0c681]"><Sparkles className="size-4" />{storyStyleNames[story.style]} story · {moments.length} moments</div>
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

function StoryMoments({ story, moments, members }: { story: Story; moments: MomentObject[]; members: Member[] }) {
  if (story.style === "flipbook") return <div className="story-flipbook flex snap-x snap-mandatory gap-5 overflow-x-auto px-[8vw] py-14 no-scrollbar sm:gap-8 sm:py-20">{moments.map((moment, index) => <section key={moment.id} className="grid h-[72vh] min-w-[84vw] snap-center overflow-hidden rounded-[32px] bg-[#fffaf2] shadow-[0_28px_80px_rgba(47,39,28,.18)] md:min-w-[62vw] lg:grid-cols-[1.25fr_.75fr]"><div className="min-h-0 overflow-hidden"><StoryMomentMedia moment={moment} /></div><div className="flex flex-col justify-between p-7 sm:p-10"><span className="font-display text-6xl italic text-[#d7c5aa]">{String(index + 1).padStart(2, "0")}</span><div><h2 className="font-display text-4xl leading-none sm:text-5xl">{moment.caption || moment.name}</h2><MomentCredit moment={moment} member={members.find((member) => member.userId === moment.uploadedBy)} /><p className="mt-6 text-xs text-[#81786b]">Swipe to turn the page →</p></div></div></section>)}</div>;
  if (story.style === "comic") return <div className="mx-auto max-w-[92rem] bg-[#f5d988] px-5 py-16 sm:px-8 lg:py-24"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{moments.map((moment, index) => <section key={moment.id} className={cn("relative overflow-hidden border-[5px] border-[#18251f] bg-[#fffaf2] shadow-[7px_7px_0_#18251f]", index % 5 === 0 && "md:col-span-2")}><div className="aspect-[4/3] overflow-hidden border-b-[5px] border-[#18251f]"><StoryMomentMedia moment={moment} /></div><div className="p-4"><span className="absolute right-3 top-3 grid size-10 place-items-center rounded-full border-4 border-[#18251f] bg-[#e8aa90] text-xs font-black">{index + 1}</span><h2 className="pr-8 text-xl font-black uppercase leading-tight tracking-[-.03em]">{moment.caption || moment.name}</h2><MomentCredit moment={moment} member={members.find((member) => member.userId === moment.uploadedBy)} /></div></section>)}</div></div>;
  if (story.style === "scrapbook") return <div className="paper-grid mx-auto max-w-[92rem] px-6 py-20 sm:px-10 lg:py-28"><div className="columns-1 gap-10 md:columns-2 xl:columns-3">{moments.map((moment, index) => <section key={moment.id} className={cn("mb-12 break-inside-avoid bg-[#fffaf2] p-3 pb-6 shadow-[0_18px_45px_rgba(70,53,33,.17)]", index % 3 === 0 ? "-rotate-1" : index % 3 === 1 ? "rotate-1" : "-rotate-[.35deg]")}><div className="aspect-[4/3] overflow-hidden bg-[#d8cbbb]"><StoryMomentMedia moment={moment} /></div><div className="px-3 pt-5"><span className="font-display text-4xl italic text-[#b1604c]">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-2 font-display text-3xl leading-none">{moment.caption || moment.name}</h2><MomentCredit moment={moment} member={members.find((member) => member.userId === moment.uploadedBy)} /></div></section>)}</div></div>;
  if (story.style === "cinematic") return <div className="bg-[#101b16] text-[#fffaf2]">{moments.map((moment, index) => <section key={moment.id} className="relative min-h-[88vh] overflow-hidden"><StoryMomentMedia moment={moment} className="absolute inset-0" /><div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,14,9,.92),rgba(5,14,9,.08)_68%),linear-gradient(90deg,rgba(5,14,9,.5),transparent_55%)]" /><div className="relative mx-auto flex min-h-[88vh] max-w-[92rem] items-end px-6 py-14 sm:px-10 lg:px-16 lg:py-20"><div className="max-w-3xl"><p className="font-display text-7xl italic text-[#f0c681]/70">{String(index + 1).padStart(2, "0")}</p><h2 className="mt-4 font-display text-[clamp(3rem,7vw,7rem)] leading-[.85] tracking-[-.055em]">{moment.caption || moment.name}</h2><MomentCredit moment={moment} member={members.find((member) => member.userId === moment.uploadedBy)} /></div></div></section>)}</div>;
  return <div className="mx-auto max-w-[86rem] px-5 py-20 sm:px-8 lg:py-28"><div className="mb-20 flex items-center gap-5"><span className="font-display text-6xl italic text-[#b1604c]">01</span><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9a5747]">The moments, in order</p><p className="mt-1 text-sm text-[#756e64]">Told by {new Set(moments.map((moment) => moment.uploadedBy)).size} people across {moments.length} memories</p></div></div><div className="grid gap-24 lg:gap-36">{moments.map((moment, index) => { const uploader = members.find((member) => member.userId === moment.uploadedBy); const reverse = index % 2 === 1; return <section key={moment.id} className={cn("story-reader-chapter grid items-center gap-8 lg:grid-cols-[1.25fr_.75fr] lg:gap-16", reverse && "lg:grid-cols-[.75fr_1.25fr]")}><div className={cn("overflow-hidden rounded-[28px] bg-[#d8cbbb] shadow-[0_30px_80px_rgba(55,45,32,.16)]", reverse && "lg:order-2")}><StoryMomentMedia moment={moment} className="max-h-[78vh]" /></div><div className={cn(reverse && "lg:order-1 lg:text-right")}><p className="font-display text-6xl italic text-[#cfb99b]">{String(index + 1).padStart(2, "0")}</p><h2 className="mt-4 font-display text-4xl leading-[1.02] tracking-[-.035em] sm:text-5xl">{moment.caption || moment.name}</h2><MomentCredit moment={moment} member={uploader} /></div></section>; })}</div></div>;
}

export function StoryShelf({ stories, objects, onOpen, onCreate, onAddMoments }: { stories: Story[]; objects: MomentObject[]; onOpen: (story: Story) => void; onCreate: () => void; onAddMoments: () => void }) {
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
  return <div className="grid gap-8">{stories.map((story) => <StoryCover key={story.id} story={story} objects={objects} onOpen={() => onOpen(story)} />)}</div>;
}

export function StoryDialog({ open, onClose, spaceId, objects, onCreated }: { open: boolean; onClose: () => void; spaceId: string; objects: MomentObject[]; onCreated: (story: Story) => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [style, setStyle] = useState<StoryStylePreference>("auto");
  const [styleSource, setStyleSource] = useState<StoryStyleSource>("auto");
  const [styleRationale, setStyleRationale] = useState("");
  const chronological = useMemo(() => [...objects].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)), [objects]);
  useEffect(() => { if (!open) { setSelected([]); setStyle("auto"); setStyleSource("auto"); setStyleRationale(""); } }, [open]);
  const mutation = useMutation({
    mutationFn: (input: { title: string; location?: string; opening: string; momentIds: string[]; style: StoryStylePreference; styleSource: StoryStyleSource; styleRationale?: string }) => api.createStory(spaceId, input),
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
      setStyle(suggestion.style);
      setStyleSource(suggestion.source);
      setStyleRationale(suggestion.rationale);
      toast.success(suggestion.source === "ai" ? "AI suggested a story format" : "A private automatic suggestion is ready");
    },
  });
  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const location = String(data.get("location") ?? "").trim();
    const momentIds = chronological.filter((object) => selected.includes(object.id)).map((object) => object.id);
    mutation.mutate({ title: String(data.get("title") ?? ""), opening: String(data.get("opening") ?? ""), momentIds, style, styleSource, ...(styleRationale ? { styleRationale } : {}), ...(location ? { location } : {}) });
  }
  const formats: Array<{ id: StoryStylePreference; title: string; description: string; icon: typeof BookOpen }> = [
    { id: "auto", title: "Auto", description: "Choose privately from your media mix and sequence.", icon: WandSparkles },
    { id: "classic", title: "Classic", description: "Timeless editorial chapters with generous space.", icon: BookOpen },
    { id: "flipbook", title: "Flipbook", description: "One moment per page, made for tapping through.", icon: Images },
    { id: "comic", title: "Comic", description: "Bold panels and captions with playful energy.", icon: LayoutGrid },
    { id: "scrapbook", title: "Scrapbook", description: "Layered keepsakes, notes, and tactile details.", icon: ImagePlus },
    { id: "cinematic", title: "Cinematic", description: "Immersive full-bleed scenes for bigger journeys.", icon: Film },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Craft a story" description="Give the moments their meaning. Your selections will read from oldest to newest." size="xl">
      <form className="grid gap-7" onSubmit={submit}>
        <section className="grid gap-4 rounded-[24px] bg-[#f3ebdf] p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">01 · Name the chapter</p></div>
          <Field label="Story title"><Input name="title" placeholder="The weekend the rain followed us" minLength={2} maxLength={100} required /></Field>
          <Field label="Place or route" hint="Optional"><Input name="location" placeholder="Kyoto · Spring 2026" maxLength={100} /></Field>
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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a9503f]">03 · Choose the experience</p><p className="mt-1 text-sm text-[#746d63]">Control the outcome, or leave it on Auto.</p></div><Button type="button" variant="secondary" disabled={selected.length < 2 || suggest.isPending} onClick={() => suggest.mutate(chronological.filter((object) => selected.includes(object.id)).map((object) => object.id))}>{suggest.isPending ? <Spinner /> : <><Sparkles className="size-4" />Ask AI to suggest</>}</Button></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((format) => <button key={format.id} type="button" onClick={() => { setStyle(format.id); setStyleSource(format.id === "auto" ? "auto" : "manual"); setStyleRationale(""); }} className={cn("rounded-[20px] border-2 p-4 text-left transition", style === format.id ? "border-[#a9503f] bg-[#fff8ec] shadow-[0_10px_28px_rgba(169,80,63,.12)]" : "border-[#ded3c3] bg-[#f4ede1] hover:border-[#b9aa96]")}><div className="flex items-center justify-between"><span className={cn("grid size-10 place-items-center rounded-[14px]", style === format.id ? "bg-[#a9503f] text-white" : "bg-[#e4d8c7] text-[#526158]")}><format.icon className="size-4" /></span>{style === format.id ? <Check className="size-4 text-[#a9503f]" /> : null}</div><strong className="mt-3 block text-sm text-[#26372f]">{format.title}</strong><span className="mt-1 block text-xs leading-5 text-[#7a7267]">{format.description}</span></button>)}
          </div>
          {styleRationale ? <div className="mt-4 flex gap-3 rounded-[18px] border border-[#d5dfd5] bg-[#edf3ed] p-4 text-xs leading-5 text-[#526158]"><Sparkles className="mt-0.5 size-4 shrink-0 text-[#496151]" /><p><strong className="text-[#34443a]">AI suggests {formats.find((format) => format.id === style)?.title}.</strong> {styleRationale} You can still choose any other format.</p></div> : null}
          <p className="mt-3 text-[11px] leading-5 text-[#8a8277]">AI is optional. When used, Zo receives only filenames, captions, dates, and media types, not your photos or files.</p>
        </section>
        <section className="grid gap-4 rounded-[24px] bg-[#20372d] p-5 text-[#fff9ee]">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">04 · Tell us why it mattered</p><p className="mt-2 text-sm leading-6 text-[#d8ddd8]">Write the opening only your people could write. The moments will carry the rest.</p></div>
          <textarea name="opening" required minLength={10} maxLength={1200} rows={4} placeholder="It started before sunrise, with three coffees and no idea where the day would take us…" className="min-h-32 w-full resize-y rounded-[18px] border border-white/15 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/45 focus:border-[#f0c681]" />
        </section>
        {mutation.error ? <p className="rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{mutation.error instanceof ZoMomentsApiError ? mutation.error.message : "The story could not be created"}</p> : null}
        <div className="flex justify-end"><Button disabled={selected.length < 2 || mutation.isPending}>{mutation.isPending ? <Spinner /> : <><Sparkles className="size-4" />Create the story</>}</Button></div>
      </form>
    </Modal>
  );
}

export function StoryReader({ story, objects, members, canDelete, onClose, onDelete }: { story: Story | null; objects: MomentObject[]; members: Member[]; canDelete: boolean; onClose: () => void; onDelete: (story: Story) => void }) {
  useEffect(() => {
    if (!story) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", close); };
  }, [onClose, story]);
  if (!story) return null;
  const moments = storyMoments(story, objects);
  const hero = moments.find((object) => object.kind === "photo");
  return (
    <article className="fixed inset-0 z-[60] overflow-y-auto bg-[#f3eadc] text-[#23372d]">
      <button onClick={onClose} className="fixed right-4 top-4 z-30 grid size-12 place-items-center rounded-full bg-[#fff9ee]/90 shadow-xl backdrop-blur-md transition hover:scale-105" aria-label="Close story"><X className="size-5" /></button>
      <header className="relative min-h-[88vh] overflow-hidden bg-[#183128] text-[#fff9ee]">
        {hero ? <img src={api.objectContentUrl(hero.spaceId, hero.id)} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,26,19,.96),rgba(9,26,19,.47)_60%,rgba(9,26,19,.18)),linear-gradient(0deg,rgba(9,26,19,.74),transparent_58%)]" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-[92rem] flex-col justify-between px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
          <button onClick={onClose} className="flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#f0c681]"><ArrowLeft className="size-4" />All stories</button>
          <div className="max-w-4xl pb-8">
            <div className="mb-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#e9ddc7]"><span className="flex items-center gap-2"><CalendarDays className="size-4" />{storyDateRange(moments)}</span>{story.location ? <span className="flex items-center gap-2"><MapPin className="size-4" />{story.location}</span> : null}<span className="flex items-center gap-2"><Sparkles className="size-4" />{storyStyleNames[story.style]} · {story.styleSource === "ai" ? "AI suggested" : story.styleSource === "manual" ? "Chosen by you" : "Auto selected"}</span></div>
            <h1 className="font-display text-[clamp(4rem,10vw,10rem)] leading-[.78] tracking-[-.065em]">{story.title}</h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#eee4d6] sm:text-xl sm:leading-9">{story.opening}</p>
          </div>
        </div>
      </header>
      <StoryMoments story={story} moments={moments} members={members} />
      <div className="mx-auto max-w-[86rem] px-5 pb-20 sm:px-8 lg:pb-28">
        <footer className="mt-28 border-t border-[#d4c6b3] pt-10 text-center"><BookOpen className="mx-auto size-8 text-[#a9503f]" /><p className="mx-auto mt-5 max-w-xl font-display text-3xl italic">The files are stored. The story is what stays.</p>{canDelete ? <Button variant="ghost" className="mt-8 text-[#9f3f31]" onClick={() => onDelete(story)}><Trash2 className="size-4" />Delete story</Button> : null}</footer>
      </div>
    </article>
  );
}
