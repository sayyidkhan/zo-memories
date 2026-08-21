import { BookOpen, Check, Cloud, Download, FileAudio, FileImage, FileText, FileVideo, History, Link2, LockKeyhole, MessageCircle, Search, Share2, WandSparkles } from "lucide-react";

const image = (name: string) => `${import.meta.env.BASE_URL}images/moments/${name}`;

function Photo({ src, className = "" }: { src: string; className?: string }) {
  return <img src={image(src)} alt="" className={`size-full object-cover ${className}`} />;
}

export function SpaceSetupIllustration() {
  return (
    <div className="relative h-48 overflow-hidden rounded-[24px] bg-[#dce5dc] p-4 sm:h-56 sm:p-5">
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[.16em] text-[#587164]"><span>Your private shared space</span><span className="grid size-9 place-items-center rounded-full bg-[#26372f] text-white"><LockKeyhole className="size-4" /></span></div>
      <div className="absolute inset-x-5 bottom-5 rounded-[20px] bg-[#fffaf2] p-4 shadow-[0_18px_45px_rgba(38,55,47,.14)] sm:inset-x-8 sm:bottom-7 sm:p-5">
        <span className="text-[9px] font-bold uppercase tracking-[.14em] text-[#a9503f]">Name your space</span>
        <div className="mt-2 rounded-xl border border-[#d7ccbc] px-3 py-2.5 font-display text-lg text-[#26372f]">Our year in motion</div>
        <div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-[#786f64]">One home for one shared chapter</span><span className="rounded-full bg-[#26372f] px-3 py-2 text-[9px] font-bold text-white">Create space</span></div>
      </div>
    </div>
  );
}

export function InviteMembersIllustration() {
  return (
    <div className="relative h-48 overflow-hidden rounded-[24px] bg-[#eadbc8] p-4 sm:h-56 sm:p-5">
      <div className="rounded-[18px] bg-[#fffaf2] p-4 shadow-[0_14px_38px_rgba(89,67,41,.11)]"><div className="flex items-center gap-2 text-[11px] font-bold text-[#34443a]"><Link2 className="size-4 text-[#a9503f]" />Private invitation</div><p className="mt-2 text-[10px] leading-4 text-[#7a7267]">One secure link · works once · expires in 30 days</p><div className="mt-3 rounded-xl bg-[#f1e9dc] px-3 py-2 text-[9px] text-[#70685e]">…/moments/join/tokyo-2026</div></div>
      <div className="mt-3 flex items-center justify-between"><div className="flex gap-2"><span className="grid size-10 place-items-center rounded-full bg-[#527c5f] text-white"><MessageCircle className="size-4" /></span><span className="grid size-10 place-items-center rounded-full bg-[#26372f] text-white"><Share2 className="size-4" /></span></div><span className="text-[9px] font-bold uppercase tracking-[.12em] text-[#8f5547]">WhatsApp · Telegram · SMS</span></div>
      <div className="absolute bottom-4 right-4 flex items-center -space-x-2"><span className="grid size-9 place-items-center rounded-full border-2 border-[#eadbc8] bg-[#789083] text-[8px] font-bold text-white">MC</span><span className="grid size-9 place-items-center rounded-full border-2 border-[#eadbc8] bg-[#b1604c] text-[8px] font-bold text-white">LT</span><span className="grid size-9 place-items-center rounded-full border-2 border-[#eadbc8] bg-[#d7bd96] text-[8px] font-bold text-[#34443a]">SR</span></div>
    </div>
  );
}

export function UploadMomentsIllustration() {
  return (
    <div className="relative h-48 overflow-hidden rounded-[24px] bg-[#d8c7ad] p-4 sm:h-56 sm:p-5">
      <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#76533f]">Add a whole day at once</p><p className="mt-1 text-[10px] text-[#6e6255]">Individual captions · shared date · optional album</p></div><span className="rounded-full bg-[#26372f] px-3 py-2 text-[9px] font-bold text-white">25 files</span></div>
      <div className="absolute bottom-4 left-5 h-32 w-24 -rotate-6 overflow-hidden rounded-[18px] border-4 border-[#fffaf2] shadow-xl sm:left-8 sm:h-40 sm:w-32"><Photo src="lisbon-tram.webp" /></div>
      <div className="absolute bottom-3 left-[35%] h-32 w-24 rotate-2 overflow-hidden rounded-[18px] border-4 border-[#fffaf2] shadow-xl sm:h-40 sm:w-32"><Photo src="iceland-waterfall.webp" /></div>
      <div className="absolute bottom-4 left-[62%] h-28 w-20 rotate-6 overflow-hidden rounded-[18px] border-4 border-[#fffaf2] shadow-xl sm:h-36 sm:w-28"><Photo src="osaka-night-market.webp" /></div>
      <div className="absolute bottom-4 right-4 grid gap-1 rounded-[14px] bg-[#fffaf2]/95 p-2 text-[#a9503f] shadow-lg sm:right-5"><FileImage className="size-3.5" /><FileVideo className="size-3.5" /><FileAudio className="size-3.5" /><FileText className="size-3.5" /></div>
    </div>
  );
}

export function LibraryIllustration() {
  return (
    <div className="h-48 overflow-hidden rounded-[24px] bg-[#efe5d7] p-3 sm:h-56 sm:p-4">
      <div className="flex items-center gap-2"><span className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#fffaf2] px-3 text-[9px] text-[#8a8175]"><Search className="size-3.5" />Search moments</span><span className="rounded-full bg-[#26372f] px-3 py-2 text-[9px] font-bold text-white">All moments</span></div>
      <div className="mt-3 flex gap-1.5 text-[8px] font-bold"><span className="rounded-full bg-[#a9503f] px-2.5 py-1.5 text-white">Tokyo</span><span className="rounded-full bg-[#ded3c3] px-2.5 py-1.5 text-[#526158]">Family</span><span className="rounded-full border border-dashed border-[#b7a68f] px-2.5 py-1.5 text-[#6f695f]">+ Album</span></div>
      <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-lg text-[#34443a]">June 2026</span><span className="text-[8px] uppercase tracking-[.12em] text-[#8d8478]">8 moments</span></div>
      <div className="mt-2 grid h-24 grid-cols-3 gap-2 sm:h-28"><div className="overflow-hidden rounded-[14px]"><Photo src="tokyo-evening.webp" /></div><div className="overflow-hidden rounded-[14px]"><Photo src="train-window.webp" /></div><div className="overflow-hidden rounded-[14px]"><Photo src="pottery-class.webp" /></div></div>
    </div>
  );
}

export function StoryBuilderIllustration() {
  return (
    <div className="h-48 overflow-hidden rounded-[24px] bg-[#20372d] p-4 text-[#fffaf2] sm:h-56 sm:p-5">
      <div className="flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#f0c681]">Shape the journey</p><p className="mt-1 text-[10px] text-[#cbd6d0]">Pick moments, then choose the mood</p></div><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-[8px] font-bold"><WandSparkles className="size-3" />AI optional</span></div>
      <div className="mt-3 grid grid-cols-4 gap-2">{["airport-dawn.webp", "island-ferry.webp", "alpine-lake.webp", "terrace-dinner.webp"].map((src, index) => <div key={src} className="relative aspect-square overflow-hidden rounded-[12px] border-2 border-[#f0c681]"><Photo src={src} /><span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-[#a9503f] text-white"><Check className="size-2.5" /></span><span className="absolute bottom-1 left-1 text-[7px] font-bold text-white">{String(index + 1).padStart(2, "0")}</span></div>)}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[9px] font-bold"><span className="rounded-xl bg-[#fffaf2] px-2 py-3 text-[#26372f]">Classic</span><span className="rounded-xl bg-[#e8dfcf] px-2 py-3 text-[#26372f]">Scrapbook</span><span className="rounded-xl border border-[#f0c681] bg-[#102019] px-2 py-3 text-white">Cinematic</span></div>
      <div className="mt-2 flex items-center gap-1.5 text-[8px] text-[#cbd6d0]"><BookOpen className="size-3" />AI can draft the opening and chapters from metadata only</div>
    </div>
  );
}

export function CanvasIllustration() {
  return (
    <div className="relative h-48 overflow-hidden rounded-[24px] bg-[#172a22] sm:h-56">
      <Photo src="coastal-roadtrip.webp" className="opacity-65" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#102019] via-[#102019]/25 to-transparent" />
      <div className="absolute left-4 right-4 top-4 flex justify-end gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#26372f]/90 px-3 py-2 text-[8px] font-bold text-white"><Cloud className="size-3" />Autosaved</span><span className="inline-flex items-center gap-1.5 rounded-full bg-[#fffaf2]/95 px-3 py-2 text-[8px] font-bold text-[#26372f]"><History className="size-3" />Versions</span></div>
      <div className="absolute inset-x-5 bottom-5 text-white"><span className="text-[8px] font-bold uppercase tracking-[.16em] text-[#f0c681]">Edit directly on the story</span><div className="mt-2 rounded-xl border border-dashed border-[#f0c681] bg-black/20 px-3 py-2 font-display text-2xl leading-none">We took the long way home.</div><p className="mt-2 text-[9px] text-white/70">Title · place · date · opening · every scene</p></div>
    </div>
  );
}

export function ExportIllustration() {
  return (
    <div className="grid h-48 grid-cols-[.8fr_1.2fr] gap-3 overflow-hidden rounded-[24px] bg-[#102019] p-4 text-white sm:h-56 sm:p-5">
      <div className="relative overflow-hidden rounded-[18px] border-2 border-white/20"><Photo src="marrakech-rooftop.webp" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /><div className="absolute inset-x-3 bottom-3"><span className="text-[7px] font-bold uppercase tracking-[.16em] text-[#f0c681]">Slide 1 of 8</span><p className="mt-1 font-display text-lg leading-none">The city turned gold.</p></div></div>
      <div className="min-w-0"><div className="grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1 text-center text-[8px] font-bold"><span className="rounded-full bg-[#f0c681] px-2 py-2 text-[#26372f]">Image</span><span className="px-2 py-2">Video</span></div><p className="mt-3 text-[8px] font-bold uppercase tracking-[.14em] text-[#f0c681]">Choose destination</p><div className="mt-2 grid grid-cols-2 gap-1.5 text-[8px] font-bold"><span className="rounded-lg bg-white/10 px-2 py-2">Instagram 4:5</span><span className="rounded-lg bg-white/10 px-2 py-2">TikTok 9:16</span><span className="rounded-lg bg-white/10 px-2 py-2">LinkedIn 1:1</span><span className="rounded-lg bg-white/10 px-2 py-2">WhatsApp</span></div><div className="mt-3 flex gap-1.5"><span className="inline-flex items-center gap-1 rounded-full bg-[#a9503f] px-2.5 py-2 text-[8px] font-bold"><Share2 className="size-3" />Share</span><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-2 text-[8px] font-bold"><Download className="size-3" />Download</span></div></div>
    </div>
  );
}
