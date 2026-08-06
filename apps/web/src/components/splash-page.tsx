import { ArrowDownRight, ArrowRight, Check, LockKeyhole, Play, Sparkles, Star } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui";

export function SplashPage({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  return (
    <main className="overflow-hidden bg-[#f3ecdf] text-[#26372f]">
      <section className="relative min-h-[100svh] overflow-hidden bg-[#26372f] text-[#fffaf2]">
        <div className="landing-noise absolute inset-0 opacity-40" />
        <div className="landing-orb landing-orb--one" />
        <div className="landing-orb landing-orb--two" />
        <div className="mx-auto flex min-h-[100svh] max-w-7xl flex-col px-5 sm:px-8 lg:px-12">
          <header className="relative z-10 flex h-20 items-center justify-between sm:h-24">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[.16em]">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#f7f0e4] p-1"><BrandMark className="size-9" /></span>
              <span>Zo Moments</span>
            </div>
            <button onClick={onSignIn} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/15">Sign in</button>
          </header>

          <div className="relative z-10 grid flex-1 items-center gap-7 pb-12 pt-10 lg:grid-cols-[1fr_.92fr] lg:gap-12 lg:pb-16 lg:pt-6">
            <div className="max-w-3xl">
              <p className="landing-reveal landing-reveal--1 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#e7b9a4]"><Star className="size-3 fill-current" /> For the life you share</p>
              <h1 className="landing-reveal landing-reveal--2 mt-6 font-display text-[clamp(4.1rem,10.2vw,9.5rem)] leading-[.78] tracking-[-.075em] text-balance">
                Hold on<br />
                to the <span className="italic text-[#e9b7a0]">good</span><br />
                stuff.
              </h1>
              <p className="landing-reveal landing-reveal--3 mt-8 max-w-lg text-lg leading-8 text-[#d7ded5] sm:text-xl">The private, shared home for your people’s photos, voice notes, tiny wins and once-in-a-lifetime days.</p>
              <div className="landing-reveal landing-reveal--4 mt-9 flex flex-col gap-3 sm:flex-row">
                <Button className="h-[3.25rem] bg-[#e6aa91] px-6 text-base text-[#26372f] shadow-[0_14px_35px_rgba(0,0,0,.2)] hover:bg-[#f0c2ae]" onClick={onGetStarted}>Begin your story <ArrowRight className="size-4" /></Button>
                <button onClick={onSignIn} className="inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-[#fffaf2] transition hover:bg-white/10">I already have a space <ArrowDownRight className="size-4" /></button>
              </div>
              <div className="landing-reveal landing-reveal--5 mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#d4ddd4]">
                <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#e6aa91]" /> Just your people</span>
                <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#e6aa91]" /> Yours to revisit</span>
              </div>
            </div>
            <MemoryStage />
          </div>
          <div className="relative z-10 flex items-center justify-between border-t border-white/10 py-4 text-[10px] font-bold uppercase tracking-[.18em] text-[#bdc8be] sm:py-5"><span>Memories, kept close</span><span className="hidden sm:block">Scroll to wander</span><ArrowDownRight className="size-4" /></div>
        </div>
      </section>

      <section className="border-b border-[#d6c8b7] bg-[#e9dfd0] py-4 overflow-hidden">
        <div className="landing-ticker whitespace-nowrap text-[11px] font-bold uppercase tracking-[.22em] text-[#6d5c4f]">Your people &nbsp;•&nbsp; Your memories &nbsp;•&nbsp; Your shared story &nbsp;•&nbsp; Your people &nbsp;•&nbsp; Your memories &nbsp;•&nbsp; Your shared story &nbsp;•&nbsp;</div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-20">
          <div className="lg:pt-5">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#a65c49]">A better place for remembering</p>
            <h2 className="mt-5 font-display text-5xl leading-[.88] tracking-[-.055em] sm:text-7xl">Not just where you put files.</h2>
            <p className="mt-7 max-w-sm text-lg leading-8 text-[#647067]">A place that grows alongside the people and moments that make a life.</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[2rem] border border-[#d8c9b7] bg-[#d8c9b7] sm:grid-cols-2">
            <StoryTile kicker="01 / Make a room" title="Create a space" body="For a relationship, a family, a friendship, a trip, or your favourite little corner of the world." tone="paper" />
            <StoryTile kicker="02 / Bring them in" title="Invite your people" body="Share one simple link through WhatsApp, Telegram, SMS, or wherever your group already lives." tone="green" />
            <StoryTile kicker="03 / Add the good stuff" title="Drop in a memory" body="Photos, videos, voice notes and documents land together, in the order your story happened." tone="clay" />
            <StoryTile kicker="Always / Yours" title="Come back anytime" body="No algorithms. No public feed. Just the things you want to keep close." tone="ink" />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#a9503f] px-5 py-24 text-[#fff8ef] sm:px-8 sm:py-32 lg:px-12">
        <div className="landing-sun absolute -right-24 -top-24 size-[35rem] rounded-full border border-[#ecb9a3]/50" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_.82fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ffd3c2]">A quieter corner of the internet</p>
            <h2 className="mt-5 max-w-4xl font-display text-[clamp(3.8rem,8vw,7.5rem)] leading-[.82] tracking-[-.065em]">For the big days.<br /><span className="italic">And every ordinary Tuesday.</span></h2>
          </div>
          <div className="rounded-[2rem] border border-white/25 bg-[#8e4033]/35 p-7 backdrop-blur-sm sm:p-9">
            <LockKeyhole className="size-7 text-[#ffd4bf]" />
            <p className="mt-8 text-xl leading-8 text-[#fff3e9]">Only the people in a space can see what is inside. It is your shared home, not a performance.</p>
            <div className="mt-8 flex items-center gap-3 text-sm font-semibold"><span className="grid size-9 place-items-center rounded-full bg-[#fff7ed] text-[#a9503f]"><Sparkles className="size-4" /></span>Private by design</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="rounded-[2.5rem] bg-[#e2d4bf] p-7 sm:p-12 lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-2xl"><BrandMark className="size-14" /><h2 className="mt-8 font-display text-5xl leading-[.9] tracking-[-.055em] sm:text-6xl">Start keeping the good stuff together.</h2><p className="mt-5 text-lg leading-8 text-[#5f665f]">It takes a minute to create your first shared space.</p></div>
          <Button className="mt-9 h-[3.25rem] shrink-0 bg-[#26372f] px-7 text-base lg:mt-0" onClick={onGetStarted}>Create a shared space <ArrowRight className="size-4" /></Button>
        </div>
      </section>
    </main>
  );
}

function StoryTile({ kicker, title, body, tone }: { kicker: string; title: string; body: string; tone: "paper" | "green" | "clay" | "ink" }) {
  const tones = { paper: "bg-[#fffaf2] text-[#26372f]", green: "bg-[#b9cabb] text-[#26372f]", clay: "bg-[#e1a084] text-[#26372f]", ink: "bg-[#26372f] text-[#fffaf2]" };
  return <article className={`min-h-64 p-6 sm:min-h-72 sm:p-8 ${tones[tone]}`}><p className="text-[10px] font-bold uppercase tracking-[.18em] opacity-65">{kicker}</p><h3 className="mt-12 font-display text-4xl leading-none tracking-[-.045em]">{title}</h3><p className="mt-4 max-w-xs leading-7 opacity-75">{body}</p></article>;
}

function MemoryStage() {
  return (
    <div className="landing-stage relative mx-auto h-[31rem] w-full max-w-[34rem] sm:h-[36rem] lg:h-[43rem]" aria-label="A moving collage of shared memories">
      <div className="landing-spark landing-spark--one"><Sparkles className="size-5" /></div><div className="landing-spark landing-spark--two"><Star className="size-4 fill-current" /></div>
      <article className="memory-card memory-card--main"><div className="memory-scene"><div className="memory-sun" /><div className="memory-hill memory-hill--back" /><div className="memory-hill memory-hill--front" /></div><p className="mt-4 font-display text-2xl text-[#34483d]">A very good day</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.17em] text-[#8a6657]">Sunday, 9:42am</p></article>
      <article className="memory-card memory-card--polaroid"><div className="grid aspect-[1.08] place-items-center rounded-[1.25rem] bg-[#b9cbbb] text-[#385344]"><BrandMark className="size-16" /></div><p className="mt-3 text-sm font-bold text-[#35483f]">Home, lately</p></article>
      <article className="memory-card memory-card--voice"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#a9503f] text-white"><Play className="ml-0.5 size-4 fill-current" /></span><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#9a5747]">Voice note</p><p className="mt-1 text-sm font-semibold text-[#3d5145]">Listen back</p></div></div><div className="mt-4 flex h-7 items-center gap-1">{[35, 80, 55, 100, 44, 75, 28, 63, 42, 85].map((height, i) => <span key={i} className="w-1 rounded-full bg-[#7c9385]" style={{ height: `${height}%` }} />)}</div></article>
      <div className="memory-stamp">2026<br /><span>together</span></div>
    </div>
  );
}
