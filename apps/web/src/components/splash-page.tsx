import { ArrowRight, Check, LockKeyhole, MessageCircleHeart, Sparkles } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui";

export function SplashPage({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4ede1] text-[#26372f]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <header className="flex h-20 items-center justify-between sm:h-24">
          <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[.16em]">
            <BrandMark className="size-10" />
            <span>Zo Moments</span>
          </div>
          <button onClick={onSignIn} className="rounded-full px-4 py-2 text-sm font-semibold text-[#4c5b51] transition hover:bg-[#e9dfd1] hover:text-[#26372f]">
            Sign in
          </button>
        </header>

        <section className="relative grid items-center gap-12 pb-20 pt-11 lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[1.02fr_.98fr] lg:gap-16 lg:py-16">
          <div className="absolute -left-24 top-12 -z-0 size-72 rounded-full bg-[#ddc5a9]/30 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#d8c9b5] bg-[#fffaf2]/70 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#875342]">
              <Sparkles className="size-3.5" /> A shared home for memories
            </p>
            <h1 className="mt-7 font-display text-[clamp(3.8rem,8vw,7.4rem)] leading-[.84] tracking-[-.06em] text-balance">
              Life is better<br />
              <span className="italic text-[#a8513f]">kept together.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#5d665f] sm:text-xl">
              Zo Moments is a private shared space for the photos, voices, trips and small details that make your life yours.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button className="h-12 px-6 text-base" onClick={onGetStarted}>Create your space <ArrowRight className="size-4" /></Button>
              <button onClick={onSignIn} className="h-12 rounded-full px-5 text-sm font-semibold text-[#536057] transition hover:bg-[#e9dfd1]">I already have an account</button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#647067]">
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#a8513f]" /> Private shared spaces</span>
              <span className="inline-flex items-center gap-2"><Check className="size-4 text-[#a8513f]" /> Invite the people who matter</span>
            </div>
          </div>

          <MemoryCollage />
        </section>
      </div>

      <section className="border-y border-[#d8cdbd] bg-[#eee5d8] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#9a5747]">One place, shared by your people</p>
            <h2 className="mt-3 font-display text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">From scattered files to a living story.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { number: "01", title: "Create a space", body: "Start one for your family, relationship, friendship or favourite group of people.", icon: BrandMark },
              { number: "02", title: "Invite your people", body: "Share a simple link through WhatsApp, Telegram, SMS or any way you already talk.", icon: MessageCircleHeart },
              { number: "03", title: "Keep adding chapters", body: "Photos, videos, voice notes and documents live together in a timeline you can revisit.", icon: Sparkles },
            ].map(({ number, title, body, icon: Icon }) => (
              <article key={number} className="rounded-[28px] border border-[#d8c9b5] bg-[#fffaf2] p-6 shadow-[0_14px_32px_rgba(68,50,29,.05)] sm:p-7">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold tracking-[.16em] text-[#9b5b49]">{number}</span>
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#eee2d2] text-[#405448]"><Icon className="size-5" /></span>
                </div>
                <h3 className="mt-10 font-display text-3xl tracking-[-.035em]">{title}</h3>
                <p className="mt-3 leading-7 text-[#746d63]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-9 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20 lg:px-12">
        <div className="rounded-[34px] bg-[#26372f] p-8 text-[#fffaf2] sm:p-11">
          <LockKeyhole className="size-7 text-[#e4b49e]" />
          <p className="mt-12 text-xs font-bold uppercase tracking-[.18em] text-[#d9b9a7]">Private by design</p>
          <h2 className="mt-3 font-display text-4xl leading-[.96] tracking-[-.04em] sm:text-5xl">Your moments are for your people, not the feed.</h2>
          <p className="mt-6 max-w-md leading-7 text-[#d7ded5]">Only members of a shared space can see what is inside it. No public profiles, no follower counts, no noise.</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#9a5747]">Made for real life</p>
          <h2 className="mt-3 font-display text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">A home for the big days and all the little ones.</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Couples building a life", "Families passing stories on", "Friends collecting adventures", "Teams marking the journey"].map((item) => (
              <div key={item} className="rounded-2xl border border-[#d8cdbd] bg-[#fffaf2] px-4 py-4 text-sm font-semibold text-[#4f5e54]">{item}</div>
            ))}
          </div>
          <Button className="mt-9 h-12 px-6 text-base" onClick={onGetStarted}>Start your shared space <ArrowRight className="size-4" /></Button>
        </div>
      </section>
    </main>
  );
}

function MemoryCollage() {
  return (
    <div className="relative mx-auto h-[29rem] w-full max-w-[34rem] sm:h-[34rem] lg:h-[39rem]" aria-label="A collage of shared memories">
      <div className="absolute left-[8%] top-[10%] size-[65%] rotate-[-7deg] rounded-[2.4rem] border-[9px] border-[#fffaf2] bg-[#b7c6bd] shadow-[0_24px_55px_rgba(52,45,35,.22)]">
        <div className="absolute inset-0 overflow-hidden rounded-[1.8rem] bg-[linear-gradient(145deg,#9bb7b7_0%,#c2caa7_48%,#dfb996_49%,#d89979_100%)]">
          <div className="absolute bottom-[17%] left-[10%] h-[42%] w-[32%] rounded-t-full bg-[#4d6756]/75" />
          <div className="absolute bottom-[12%] left-[33%] h-[54%] w-[38%] rounded-t-[100%] bg-[#3f5548]/85" />
          <div className="absolute bottom-0 left-0 h-[28%] w-full bg-[#d78969]/75" />
          <span className="absolute bottom-6 left-6 rounded-full bg-[#fffaf2]/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#4b5c50]">Sunday walk</span>
        </div>
      </div>
      <div className="absolute right-[2%] top-[3%] w-[44%] rotate-[9deg] rounded-[2rem] border-[8px] border-[#fffaf2] bg-[#d9b9a7] p-4 shadow-[0_20px_42px_rgba(52,45,35,.18)] sm:p-5">
        <div className="aspect-square rounded-[1.25rem] bg-[linear-gradient(135deg,#f3d4b3_0%,#d58367_45%,#7e9b88_46%,#4b6657_100%)]" />
        <p className="mt-3 font-display text-xl text-[#33493d]">Tokyo, 2026</p>
      </div>
      <div className="absolute bottom-[2%] right-[8%] w-[54%] rotate-[5deg] rounded-[2rem] border-[8px] border-[#fffaf2] bg-[#f0e2cc] p-4 shadow-[0_20px_48px_rgba(52,45,35,.2)] sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#a8513f] text-[#fffaf2]"><MessageCircleHeart className="size-5" /></div>
          <div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#9a5747]">Voice note</p><p className="mt-1 text-sm font-semibold text-[#435247]">You had to be there.</p></div>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          {[30, 58, 42, 76, 44, 65, 34, 54, 29].map((height, index) => <span key={index} style={{ height: `${height}%` }} className="h-6 w-1 rounded-full bg-[#789082]" />)}
        </div>
      </div>
      <div className="absolute bottom-[13%] left-[1%] grid size-16 rotate-[-12deg] place-items-center rounded-[1.5rem] bg-[#fffaf2] text-[#a8513f] shadow-[0_12px_30px_rgba(52,45,35,.16)] sm:size-20"><BrandMark className="size-10 sm:size-12" /></div>
      <div className="absolute left-[2%] top-[1%] size-20 rounded-full border border-[#cbbca8] border-dashed" />
    </div>
  );
}
