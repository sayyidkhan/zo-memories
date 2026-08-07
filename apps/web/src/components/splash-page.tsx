import { ArrowDown, ArrowRight, Check, LockKeyhole, MessageCircle, Play, Sparkles, Star, Users } from "lucide-react";
import type { PointerEvent } from "react";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui";

const momentImages = {
  coast: `${import.meta.env.BASE_URL}images/moments/coastal-roadtrip.webp`,
  city: `${import.meta.env.BASE_URL}images/moments/tokyo-evening.webp`,
  mountain: `${import.meta.env.BASE_URL}images/moments/mountain-morning.webp`,
  dinner: `${import.meta.env.BASE_URL}images/moments/terrace-dinner.webp`,
};

export function SplashPage({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  const moveSpotlight = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <main className="landing-shell overflow-hidden bg-[#f3ecdf] text-[#26372f]">
      <section className="archive-hero relative min-h-[100svh] overflow-hidden bg-[#20342b] text-[#fffaf2]" onPointerMove={moveSpotlight}>
        <div className="archive-grain absolute inset-0" />
        <div className="archive-spotlight absolute inset-0" />
        <div className="archive-ring archive-ring--one" />
        <div className="archive-ring archive-ring--two" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[90rem] flex-col px-5 sm:px-8 lg:px-12">
          <header className="flex h-20 items-center justify-between border-b border-white/10 sm:h-24">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.19em] sm:text-sm">
              <span className="grid size-11 place-items-center rounded-[15px] bg-[#fff8ed] p-1"><BrandMark className="size-9" /></span>
              <span>Zo Moments</span>
            </div>
            <button onClick={onSignIn} className="group inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-5 text-sm font-semibold backdrop-blur-md transition hover:border-white/30 hover:bg-white/[.12]">
              Sign in <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </header>

          <div className="relative flex flex-1 flex-col justify-center py-12 sm:py-16 lg:py-10">
            <div className="archive-copy relative z-20 mx-auto w-full text-center">
              <p className="landing-intro landing-intro--1 inline-flex items-center gap-2 rounded-full border border-[#edb59e]/25 bg-[#edb59e]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#f2c2ae]">
                <Sparkles className="size-3" /> A shared digital home
              </p>
              <h1 className="landing-intro landing-intro--2 mx-auto mt-6 max-w-6xl font-display text-[clamp(4rem,10.3vw,9.8rem)] leading-[.78] tracking-[-.075em] text-balance">
                Make a home for<br />
                <span className="italic text-[#e8aa90]">the life</span> you share.
              </h1>
              <p className="landing-intro landing-intro--3 mx-auto mt-7 max-w-2xl text-base leading-7 text-[#d1dbd4] sm:mt-9 sm:text-xl sm:leading-8">
                One private place where your people can keep every trip, celebration, voice note and ordinary day that becomes a life together.
              </p>
              <div className="landing-intro landing-intro--4 mt-8 flex flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row">
                <Button className="h-14 w-full bg-[#e8aa90] px-7 text-base text-[#20342b] shadow-[0_18px_50px_rgba(0,0,0,.28)] hover:bg-[#f4c5b1] sm:w-auto" onClick={onGetStarted}>
                  Create your first space <ArrowRight className="size-4" />
                </Button>
                <button onClick={onSignIn} className="h-14 w-full rounded-full border border-white/10 bg-[#20342b]/75 px-7 text-sm font-semibold text-[#fffaf2] backdrop-blur-md transition hover:border-white/20 hover:bg-white/10 sm:w-auto">I already have one</button>
              </div>
            </div>

            <MemoryReel />
          </div>

          <div className="relative z-20 flex items-center justify-between border-t border-white/10 py-4 text-[9px] font-bold uppercase tracking-[.2em] text-[#aebdb4] sm:py-5 sm:text-[10px]">
            <span>Private by design</span>
            <a href="#why" className="group hidden items-center gap-2 transition hover:text-white sm:inline-flex">See the story <ArrowDown className="size-3.5 transition-transform group-hover:translate-y-1" /></a>
            <span>Made for your people</span>
          </div>
        </div>
      </section>

      <section id="why" className="relative mx-auto max-w-[90rem] px-5 py-24 sm:px-8 sm:py-36 lg:px-12 lg:py-44">
        <div className="story-reveal grid gap-12 lg:grid-cols-[.88fr_1.12fr] lg:items-start lg:gap-24">
          <div className="lg:sticky lg:top-24">
            <p className="landing-kicker">The elephant in the group chat</p>
            <h2 className="mt-6 max-w-xl font-display text-[clamp(3.6rem,7vw,7.4rem)] leading-[.82] tracking-[-.065em]">
              We share everything.<br /><span className="italic text-[#a9503f]">Then lose it.</span>
            </h2>
          </div>
          <div className="pt-2 lg:pt-32">
            <p className="max-w-2xl text-2xl leading-[1.35] tracking-[-.025em] text-[#516158] sm:text-4xl sm:leading-[1.25]">
              Photos sink beneath messages. Voice notes disappear. The moments that mattered become impossible to find.
            </p>
            <p className="mt-8 max-w-xl text-base leading-8 text-[#777168] sm:text-lg">Zo Moments gives a relationship, family or friendship one lasting place of its own. Not another feed. Not another folder. A home you build together.</p>
            <ChatToArchive />
          </div>
        </div>
      </section>

      <ExperienceGallery />

      <section className="journey-section relative overflow-hidden bg-[#c8d3c8] px-5 py-24 text-[#21352c] sm:px-8 sm:py-36 lg:px-12 lg:py-40">
        <div className="journey-halo absolute inset-y-0 right-[-18rem] w-[48rem] rounded-full border border-[#73897a]/30" />
        <div className="relative mx-auto max-w-[90rem]">
          <div className="story-reveal flex flex-col justify-between gap-8 border-b border-[#6f8676]/35 pb-10 lg:flex-row lg:items-end">
            <div>
              <p className="landing-kicker text-[#914d40]">Three small steps</p>
              <h2 className="mt-5 max-w-4xl font-display text-[clamp(3.6rem,7.6vw,8rem)] leading-[.82] tracking-[-.07em]">From “remember this?”<br /><span className="italic">to always remembered.</span></h2>
            </div>
            <p className="max-w-sm text-base leading-7 text-[#52655a] lg:pb-2">No onboarding maze. Make a space, send one link, and start adding the life already happening around you.</p>
          </div>

          <div className="journey-line relative mt-12 grid gap-5 lg:grid-cols-3 lg:gap-0">
            <JourneyStep number="01" icon={<BrandMark className="size-12" />} title="Make your space" body="Name a private home for your family, friendship, relationship or favourite people." />
            <JourneyStep number="02" icon={<Users className="size-9" />} title="Bring people in" body="Share one invitation through WhatsApp, Telegram, SMS or wherever you already talk." />
            <JourneyStep number="03" icon={<Sparkles className="size-9" />} title="Let it grow" body="Everyone adds photos, video and voice notes. Zo Moments keeps the story in order." />
          </div>
        </div>
      </section>

      <section className="privacy-stage relative overflow-hidden bg-[#20342b] px-5 py-28 text-[#fffaf2] sm:px-8 sm:py-40 lg:px-12 lg:py-48">
        <div className="privacy-orbit" />
        <div className="story-reveal relative z-10 mx-auto max-w-[90rem] text-center">
          <div className="privacy-seal mx-auto grid size-24 place-items-center rounded-[2rem] border border-[#efc5b4]/30 bg-[#efc5b4]/10 sm:size-28">
            <LockKeyhole className="size-9 text-[#f0b69e]" />
          </div>
          <p className="mt-9 text-[10px] font-bold uppercase tracking-[.23em] text-[#efb69f]">A quieter corner of the internet</p>
          <h2 className="mx-auto mt-5 max-w-6xl font-display text-[clamp(4rem,10vw,10rem)] leading-[.78] tracking-[-.075em]">No feed.<br />No followers.<br /><span className="italic text-[#e8aa90]">Just your people.</span></h2>
          <p className="mx-auto mt-10 max-w-xl text-lg leading-8 text-[#cbd7cf]">Only members of a space can see what is inside. Admins manage accounts, not your private memories.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-[#d8e1db]">
            <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#e8aa90]" /> Private spaces</span>
            <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#e8aa90]" /> Your original files</span>
            <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#e8aa90]" /> No public profiles</span>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-36 lg:px-12">
        <div className="final-card story-reveal relative mx-auto max-w-[90rem] overflow-hidden rounded-[2rem] bg-[#e5d6c1] px-6 py-16 sm:rounded-[3rem] sm:px-12 sm:py-24 lg:px-20">
          <div className="final-card__mark absolute -right-14 -top-16 opacity-[.08]"><BrandMark className="size-80 sm:size-[28rem]" /></div>
          <div className="relative z-10 max-w-4xl">
            <p className="landing-kicker">Your first chapter is one minute away</p>
            <h2 className="mt-6 font-display text-[clamp(3.8rem,8vw,8rem)] leading-[.82] tracking-[-.07em]">Keep the good stuff.<br /><span className="italic text-[#a9503f]">Together.</span></h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#657068]">Create a space now. Invite your favourite person when you are ready.</p>
            <Button className="mt-9 h-14 bg-[#20342b] px-7 text-base" onClick={onGetStarted}>Begin your story <ArrowRight className="size-4" /></Button>
          </div>
        </div>
        <footer className="mx-auto flex max-w-[90rem] items-center justify-between py-8 text-[10px] font-bold uppercase tracking-[.18em] text-[#746d63]">
          <span className="flex items-center gap-2"><BrandMark className="size-7" /> Zo Moments</span><span>Made on Zo</span>
        </footer>
      </section>
    </main>
  );
}

function MemoryReel() {
  return (
    <div className="memory-reel landing-intro landing-intro--5 relative z-10 mx-[-12rem] mt-10 h-60 sm:mx-[-8rem] sm:mt-12 sm:h-72 lg:absolute lg:inset-x-[-10rem] lg:bottom-[3rem] lg:mt-0 lg:h-64" aria-label="A reel of shared memories">
      <div className="memory-reel__track">
        <ReelCard className="reel-card--one" date="21 MAY" title="Pacific Coast" image={momentImages.coast} position="center" />
        <ReelCard className="reel-card--two" date="04 JUL" title="Tokyo after rain" image={momentImages.city} position="center 42%" />
        <VoiceCard />
        <ReelCard className="reel-card--four" date="18 OCT" title="Above the clouds" image={momentImages.mountain} position="center 58%" />
        <ReelCard className="reel-card--five" date="01 JAN" title="Dinner in Tuscany" image={momentImages.dinner} position="center" />
      </div>
    </div>
  );
}

function ReelCard({ className, date, title, image, position }: { className: string; date: string; title: string; image: string; position: string }) {
  return (
    <article className={`reel-card ${className}`}>
      <img className="reel-photo" src={image} alt="" loading="eager" decoding="async" style={{ objectPosition: position }} />
      <div className="flex items-end justify-between gap-3 px-1 pt-3"><div><p className="font-display text-lg leading-none text-[#26372f]">{title}</p><p className="mt-1.5 text-[8px] font-bold uppercase tracking-[.17em] text-[#9b5d4e]">{date}</p></div><BrandMark className="size-7 shrink-0 opacity-55" /></div>
    </article>
  );
}

function VoiceCard() {
  return (
    <article className="reel-card reel-card--voice">
      <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-full bg-[#a9503f] text-white"><Play className="ml-0.5 size-4 fill-current" /></span><div><p className="text-[8px] font-bold uppercase tracking-[.18em] text-[#a9503f]">Voice note · 0:24</p><p className="mt-1 font-display text-lg text-[#26372f]">You have to hear this</p></div></div>
      <div className="voice-wave mt-7 flex h-12 items-center gap-1.5">{[30, 70, 42, 95, 50, 78, 35, 88, 55, 100, 44, 68, 28, 75, 40].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div>
    </article>
  );
}

function ChatToArchive() {
  return (
    <div className="archive-demo relative mt-14 overflow-hidden rounded-[2rem] border border-[#d2c3b0] bg-[#e8ddcd] p-4 sm:mt-20 sm:p-6">
      <div className="relative z-[1] grid gap-4 sm:grid-cols-[.88fr_1.12fr]">
        <div className="chat-panel rounded-[1.4rem] bg-[#d5cab9] p-5 text-[#5d615c]">
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em]"><MessageCircle className="size-3.5" /> Somewhere in the chat</div>
          <div className="chat-stack mt-7 space-y-3">
            <span>IMG_4829.jpg</span>
            <span>Listen to this 😂</span>
            <span>Who has the birthday video?</span>
            <span className="chat-photo"><img src={momentImages.city} alt="" /><b>Sent a photo</b></span>
          </div>
        </div>
        <div className="archive-drawer relative overflow-hidden rounded-[1.4rem] bg-[#fffaf2] p-5">
          <div className="archive-meta flex items-center justify-between text-[9px] font-bold uppercase tracking-[.18em] text-[#8c5b4e]"><span>Inside your space</span><span>June 2026</span></div>
          <div className="archive-waiting" aria-hidden="true"><span /><span /><span /></div>
          <div className="mt-7 grid grid-cols-3 gap-2"><img className="mini-memory archive-memory--one" src={momentImages.city} alt="" /><img className="mini-memory archive-memory--two" src={momentImages.mountain} alt="" /><img className="mini-memory archive-memory--three" src={momentImages.dinner} alt="" /></div>
          <div className="archive-caption"><p className="mt-5 font-display text-2xl">Tokyo, together</p><p className="mt-1 text-xs text-[#788078]">143 photos · 12 videos · 2 voice notes</p></div>
          <div className="archive-saved" aria-hidden="true">Memory saved</div>
        </div>
      </div>
      <div className="archive-transfer" aria-hidden="true"><img src={momentImages.city} alt="" /><span><ArrowRight className="size-3" /></span></div>
    </div>
  );
}

function ExperienceGallery() {
  return (
    <section className="experience-section relative overflow-hidden bg-[#e7dccd] px-5 py-24 sm:px-8 sm:py-36 lg:px-12 lg:py-40">
      <GoldenShootingStar />
      <div className="relative z-[1] mx-auto max-w-[90rem]">
        <div className="story-reveal grid gap-8 border-b border-[#c9b9a5] pb-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="landing-kicker">Your shared travel journal</p>
            <h2 className="mt-5 max-w-5xl font-display text-[clamp(3.8rem,8vw,8.2rem)] leading-[.8] tracking-[-.07em]">Every trip becomes<br /><span className="italic text-[#a9503f]">a chapter.</span></h2>
          </div>
          <p className="max-w-lg text-lg leading-8 text-[#667068] lg:justify-self-end lg:pb-2">The views, the people, the voice notes, the meals and the small details everyone remembers differently. Kept together by everyone who was there.</p>
        </div>

        <div className="experience-grid mt-10 sm:mt-14">
          <ExperiencePhoto className="experience-photo--coast" image={momentImages.coast} location="Pacific Coast" detail="Road trip · 48 moments" />
          <ExperiencePhoto className="experience-photo--city" image={momentImages.city} location="Tokyo" detail="Night walk · 83 moments" />
          <ExperiencePhoto className="experience-photo--mountain" image={momentImages.mountain} location="The ridge" detail="Morning hike · 31 moments" />
          <ExperiencePhoto className="experience-photo--dinner" image={momentImages.dinner} location="Tuscany" detail="Last-night dinner · 26 moments" />
        </div>
      </div>
    </section>
  );
}

function GoldenShootingStar() {
  return (
    <div className="golden-shooting-star" aria-hidden="true">
      <span className="shooting-star__trail" />
      <i className="shooting-star__spark shooting-star__spark--one" />
      <i className="shooting-star__spark shooting-star__spark--two" />
      <i className="shooting-star__spark shooting-star__spark--three" />
      <span className="shooting-star__core"><Star className="size-6 fill-current" /></span>
    </div>
  );
}

function ExperiencePhoto({ className, image, location, detail }: { className: string; image: string; location: string; detail: string }) {
  return (
    <figure className={`experience-photo story-reveal ${className}`}>
      <img src={image} alt={`${location} travel memory`} loading="lazy" decoding="async" />
      <figcaption><span className="font-display text-2xl sm:text-3xl">{location}</span><span className="text-[9px] font-bold uppercase tracking-[.17em]">{detail}</span></figcaption>
    </figure>
  );
}

function JourneyStep({ number, icon, title, body }: { number: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="journey-step story-reveal relative border-[#748a7b]/35 py-8 lg:border-r lg:px-10 lg:py-12 first:lg:pl-0 last:lg:border-r-0 last:lg:pr-0">
      <div className="flex items-start justify-between"><span className="grid size-16 place-items-center rounded-[1.4rem] border border-[#718777]/25 bg-[#edf0e7]/65 shadow-[0_10px_30px_rgba(47,72,57,.08)]">{icon}</span><span className="font-display text-5xl italic text-[#a45140]/40">{number}</span></div>
      <h3 className="mt-14 font-display text-4xl leading-none tracking-[-.045em] sm:text-5xl">{title}</h3>
      <p className="mt-5 max-w-sm leading-7 text-[#506358]">{body}</p>
    </article>
  );
}
