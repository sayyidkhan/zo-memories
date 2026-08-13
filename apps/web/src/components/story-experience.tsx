import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, FileText, ImagePlus, MapPin, Sparkles, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { Member, MomentObject, Story } from "@zo-moments/types";
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
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#f0c681]"><Sparkles className="size-4" />Story · {moments.length} moments</div>
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
  const chronological = useMemo(() => [...objects].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)), [objects]);
  useEffect(() => { if (!open) setSelected([]); }, [open]);
  const mutation = useMutation({
    mutationFn: (input: { title: string; location?: string; opening: string; momentIds: string[] }) => api.createStory(spaceId, input),
    onSuccess: async ({ story }) => {
      await queryClient.invalidateQueries({ queryKey: ["stories", spaceId] });
      toast.success("Your story is ready to read");
      onCreated(story);
      onClose();
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
    mutation.mutate({ title: String(data.get("title") ?? ""), opening: String(data.get("opening") ?? ""), momentIds, ...(location ? { location } : {}) });
  }
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
        <section className="grid gap-4 rounded-[24px] bg-[#20372d] p-5 text-[#fff9ee]">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">03 · Tell us why it mattered</p><p className="mt-2 text-sm leading-6 text-[#d8ddd8]">Write the opening only your people could write. The moments will carry the rest.</p></div>
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
            <div className="mb-6 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#e9ddc7]"><span className="flex items-center gap-2"><CalendarDays className="size-4" />{storyDateRange(moments)}</span>{story.location ? <span className="flex items-center gap-2"><MapPin className="size-4" />{story.location}</span> : null}</div>
            <h1 className="font-display text-[clamp(4rem,10vw,10rem)] leading-[.78] tracking-[-.065em]">{story.title}</h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-[#eee4d6] sm:text-xl sm:leading-9">{story.opening}</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[86rem] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mb-20 flex items-center gap-5"><span className="font-display text-6xl italic text-[#b1604c]">01</span><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#9a5747]">The moments, in order</p><p className="mt-1 text-sm text-[#756e64]">Told by {new Set(moments.map((moment) => moment.uploadedBy)).size} people across {moments.length} memories</p></div></div>
        <div className="grid gap-24 lg:gap-36">
          {moments.map((moment, index) => {
            const uploader = members.find((member) => member.userId === moment.uploadedBy);
            const reverse = index % 2 === 1;
            return <section key={moment.id} className={cn("story-reader-chapter grid items-center gap-8 lg:grid-cols-[1.25fr_.75fr] lg:gap-16", reverse && "lg:grid-cols-[.75fr_1.25fr]")}>
              <div className={cn("overflow-hidden rounded-[28px] bg-[#d8cbbb] shadow-[0_30px_80px_rgba(55,45,32,.16)]", reverse && "lg:order-2")}>
                {moment.kind === "photo" ? <img src={api.objectContentUrl(moment.spaceId, moment.id)} alt={moment.caption || moment.name} className="max-h-[78vh] w-full object-cover" /> : <div className="grid min-h-80 place-items-center bg-[#26372f] text-[#f0c681]"><FileText className="size-14" /></div>}
              </div>
              <div className={cn(reverse && "lg:order-1 lg:text-right")}>
                <p className="font-display text-6xl italic text-[#cfb99b]">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-4 font-display text-4xl leading-[1.02] tracking-[-.035em] sm:text-5xl">{moment.caption || moment.name}</h2>
                <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#9a5747]">{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(moment.occurredAt))}{uploader ? ` · ${uploader.name}` : ""}</p>
              </div>
            </section>;
          })}
        </div>
        <footer className="mt-28 border-t border-[#d4c6b3] pt-10 text-center"><BookOpen className="mx-auto size-8 text-[#a9503f]" /><p className="mx-auto mt-5 max-w-xl font-display text-3xl italic">The files are stored. The story is what stays.</p>{canDelete ? <Button variant="ghost" className="mt-8 text-[#9f3f31]" onClick={() => onDelete(story)}><Trash2 className="size-4" />Delete story</Button> : null}</footer>
      </div>
    </article>
  );
}

export function OnboardingGuide({ expanded, onToggle, members, momentCount, storyCount, canInvite, onInvite, onUpload, onStory }: { expanded: boolean; onToggle: () => void; members: Member[]; momentCount: number; storyCount: number; canInvite: boolean; onInvite: () => void; onUpload: () => void; onStory: () => void }) {
  const steps = [
    { number: "01", title: "Make a shared space", body: "A private home for one relationship or chapter.", done: true, icon: UsersRound, action: null },
    { number: "02", title: "Bring in your people", body: "Send one link through WhatsApp, Telegram or SMS.", done: members.length > 1, icon: UserPlus, action: canInvite ? onInvite : null },
    { number: "03", title: "Collect the moments", body: "Add the photos, voices and details while they are fresh.", done: momentCount >= 2, icon: ImagePlus, action: onUpload },
    { number: "04", title: "Shape the story", body: "Choose what belongs together and tell why it mattered.", done: storyCount > 0, icon: Sparkles, action: momentCount >= 2 ? onStory : null },
  ];
  const complete = steps.filter((step) => step.done).length;
  if (!expanded) return <button onClick={onToggle} className="mb-8 flex w-full items-center justify-between rounded-[22px] border border-[#d8cbbb] bg-[#eee3d4] px-5 py-4 text-left transition hover:bg-[#e8dccb]"><span><strong className="block text-sm text-[#2d4036]">How Zo Moments works</strong><span className="mt-0.5 block text-xs text-[#776f64]">From a shared space to a story worth revisiting</span></span><span className="rounded-full bg-[#26372f] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#fff9ee]">{complete}/4</span></button>;
  return (
    <section className="onboarding-guide relative mb-10 overflow-hidden rounded-[30px] bg-[#20372d] p-6 text-[#fff9ee] shadow-[0_25px_65px_rgba(33,52,42,.16)] sm:p-8">
      <div className="absolute -right-20 -top-24 size-72 rounded-full bg-[#d69476]/20 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#f0c681]">Your path to a living story</p><h2 className="mt-3 max-w-2xl font-display text-4xl leading-[.96] tracking-[-.035em] sm:text-5xl">Don’t just upload. Build the story together.</h2></div><button onClick={onToggle} className="w-fit text-xs font-semibold text-[#d9e0dc] hover:text-white">Hide guide</button></div>
      <div className="relative mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => <button key={step.number} type="button" onClick={step.action ?? undefined} disabled={!step.action} className={cn("group rounded-[22px] border p-4 text-left transition", step.done ? "border-white/10 bg-white/8" : step.action ? "border-[#f0c681]/40 bg-[#f0c681]/10 hover:-translate-y-1 hover:bg-[#f0c681]/15" : "border-white/10 bg-white/5 opacity-60")}>
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-[.18em] text-[#f0c681]">{step.number}</span><span className={cn("grid size-8 place-items-center rounded-full", step.done ? "bg-[#789083]" : "bg-white/10")}>{step.done ? <Check className="size-4" /> : <step.icon className="size-4" />}</span></div>
          <strong className="mt-5 block text-sm">{step.title}</strong><span className="mt-2 block text-xs leading-5 text-[#c9d2cc]">{step.body}</span>{!step.done && step.action ? <span className="mt-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[.13em] text-[#f0c681]">Start this step <ArrowRight className="size-3" /></span> : null}
        </button>)}
      </div>
    </section>
  );
}
