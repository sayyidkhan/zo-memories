import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Film, Image, ImagePlus, Link2, LockKeyhole, Maximize2, MessageCircle, MoreHorizontal, ShieldCheck, Sparkles, Trash2, UserPlus, UsersRound } from "lucide-react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { Invitation, Member, MomentObject } from "@zo-moments/types";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { Button, Modal, Spinner } from "./ui";

type GuideAction = "invite" | "upload" | "story";

function PeopleIllustration() {
  return (
    <div className="relative h-32 overflow-hidden rounded-[22px] bg-[#dce5dc]">
      <div className="absolute inset-x-5 bottom-4 rounded-[18px] bg-[#fffaf2] p-3 shadow-[0_12px_30px_rgba(38,55,47,.12)]">
        <div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8f5547]">Khan Family</span><LockKeyhole className="size-3.5 text-[#607066]" /></div>
        <div className="mt-3 flex items-center"><span className="grid size-8 place-items-center rounded-full border-2 border-[#fffaf2] bg-[#789083] text-[9px] font-bold text-white">SK</span><span className="-ml-2 grid size-8 place-items-center rounded-full border-2 border-[#fffaf2] bg-[#b1604c] text-[9px] font-bold text-white">SA</span><span className="-ml-2 grid size-8 place-items-center rounded-full border-2 border-[#fffaf2] bg-[#d7bd96] text-[9px] font-bold text-[#34443a]">+1</span><span className="ml-2 text-[10px] font-semibold text-[#526158]">Your people, one private home</span></div>
      </div>
      <span className="absolute right-4 top-3 font-display text-5xl italic text-[#789083]/20">01</span>
    </div>
  );
}

function InviteIllustration() {
  return (
    <div className="relative h-32 overflow-hidden rounded-[22px] bg-[#eadbc8]">
      <div className="absolute left-4 top-4 w-[72%] rounded-[18px] bg-[#fffaf2] p-3 shadow-[0_12px_30px_rgba(89,67,41,.1)]"><div className="flex items-center gap-2 text-[10px] font-bold text-[#34443a]"><Link2 className="size-3.5 text-[#a9503f]" />Private invitation</div><div className="mt-2 h-2 rounded-full bg-[#e6ded2]" /><div className="mt-1.5 h-2 w-2/3 rounded-full bg-[#e6ded2]" /></div>
      <div className="absolute bottom-3 right-4 flex gap-1.5"><span className="grid size-8 place-items-center rounded-full bg-[#527c5f] text-white"><MessageCircle className="size-3.5" /></span><span className="grid size-8 place-items-center rounded-full bg-[#26372f] text-white"><MoreHorizontal className="size-3.5" /></span></div>
      <span className="absolute right-4 top-3 font-display text-5xl italic text-[#a9503f]/15">02</span>
    </div>
  );
}

function MomentsIllustration() {
  return (
    <div className="relative h-32 overflow-hidden rounded-[22px] bg-[#d8c7ad]">
      <div className="absolute -bottom-6 left-5 h-28 w-24 -rotate-6 overflow-hidden rounded-[16px] border-4 border-[#fffaf2] bg-[#789083] shadow-lg"><img src={`${import.meta.env.BASE_URL}images/moments/lisbon-tram.webp`} alt="" className="size-full object-cover" /></div>
      <div className="absolute -bottom-5 left-[42%] h-28 w-24 rotate-3 overflow-hidden rounded-[16px] border-4 border-[#fffaf2] bg-[#b1604c] shadow-lg"><img src={`${import.meta.env.BASE_URL}images/moments/iceland-waterfall.webp`} alt="" className="size-full object-cover" /></div>
      <div className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-[#26372f] text-[#fffaf2] shadow-lg"><ImagePlus className="size-4" /></div>
    </div>
  );
}

function StoryIllustration() {
  return (
    <div className="relative h-32 overflow-hidden rounded-[22px] bg-[#26372f] p-3 text-[#fffaf2]">
      <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-[.15em] text-[#f0c681]"><span>Choose the story style</span><span className="rounded-full bg-white/10 px-2 py-1">Auto</span></div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className="rounded-[10px] bg-[#fff8ec] px-2 py-2 text-[#26372f]"><span className="font-display text-sm">Classic</span><span className="mt-1 block h-0.5 w-8 rounded bg-[#b1604c]" /></div>
        <div className="relative overflow-hidden rounded-[10px] bg-[#e8dfcf] px-2 py-2 text-[#26372f]"><span className="font-display text-sm">Scrapbook</span><span className="absolute -bottom-1 right-2 size-4 rotate-6 bg-[#e8aa90]" /></div>
        <div className="rounded-[10px] bg-[#102019] px-2 py-2 text-[#fff8ec]"><span className="font-display text-sm">Cinematic</span><span className="mt-1 block h-0.5 w-8 rounded bg-[#f0c681]" /></div>
      </div>
      <div className="mt-2 flex gap-1.5 text-[8px] font-bold"><span className="flex items-center gap-1 rounded-full bg-[#f0c681] px-2 py-1 text-[#26372f]"><Image className="size-2.5" />Image carousel</span><span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><Film className="size-2.5" />Social video</span></div>
    </div>
  );
}

export function HowItWorksDialog({ open, onClose, members, momentCount, storyCount, canInvite, onAction }: { open: boolean; onClose: () => void; members: Member[]; momentCount: number; storyCount: number; canInvite: boolean; onAction: (action: GuideAction) => void }) {
  const steps = [
    { number: "01", title: "Create a home", summary: "Start one space for one relationship, family, trip, or chapter.", detail: "Every space has its own people, moments, albums, and stories. Content never spills into another shared space.", done: true, action: null, actionLabel: null, illustration: <PeopleIllustration /> },
    { number: "02", title: "Bring in your people", summary: "Share a private link through WhatsApp, Telegram, SMS, or any messaging app.", detail: "The first person who accepts joins this space. Owners can see who belongs here and remove members later.", done: members.length > 1, action: canInvite ? "invite" as const : null, actionLabel: "Invite someone", illustration: <InviteIllustration /> },
    { number: "03", title: "Collect together", summary: "Everyone adds photos, videos, voice notes, PDFs, and the little details around them.", detail: "Add a date and caption so each memory keeps its context. Use albums when you want a simple collection.", done: momentCount >= 2, action: "upload" as const, actionLabel: "Add a moment", illustration: <MomentsIllustration /> },
    { number: "04", title: "Choose the story and output", summary: "Pick Classic, Scrapbook, or Cinematic, then preview it as an image carousel or social video.", detail: "Choose the moments and opening, or let Auto select the style. Every export adapts its crop, safe area, dimensions, and pacing to the destination.", done: storyCount > 0, action: momentCount >= 2 ? "story" as const : null, actionLabel: momentCount >= 2 ? "Craft a story" : "Add two moments first", illustration: <StoryIllustration /> },
  ];
  const complete = steps.filter((step) => step.done).length;
  return (
    <Modal open={open} onClose={onClose} title="How Zo Moments works" description="From a private shared space to a story shaped for every destination." size="xl">
      <div className="mb-6 rounded-[24px] bg-[#20372d] px-5 py-4 text-[#fffaf2] sm:flex sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">Your space progress</p><p className="mt-1 text-sm text-[#d7dfda]">{complete} of 4 stages complete · {members.length} people · {momentCount} moments · {storyCount} {storyCount === 1 ? "story" : "stories"}</p></div><div className="mt-4 flex gap-2 sm:mt-0">{steps.map((step) => <span key={step.number} className={`grid size-8 place-items-center rounded-full border text-[9px] font-bold ${step.done ? "border-[#f0c681] bg-[#f0c681] text-[#20372d]" : "border-white/20 bg-white/5 text-white/55"}`}>{step.number}</span>)}</div></div>
      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((step) => <article key={step.number} className="rounded-[26px] border border-[#ded2c2] bg-[#f8f1e7] p-4 sm:p-5">
          {step.illustration}
          <div className="mt-5 flex items-center justify-between gap-3"><span className="inline-flex items-baseline gap-1.5 rounded-full bg-[#26372f] px-3 py-1.5 text-[#fffaf2]"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-[#f0c681]">Step</span><strong className="font-display text-lg leading-none">{step.number}</strong></span><span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.12em] ${step.done ? "text-[#587164]" : "text-[#9a5747]"}`}>{step.done ? <><Check className="size-3.5" /> Complete</> : "Up next"}</span></div>
          <div className="mt-4"><h3 className="font-display text-2xl leading-none text-[#26372f]">{step.title}</h3><p className="mt-2 text-sm font-semibold leading-5 text-[#526158]">{step.summary}</p><p className="mt-2 text-xs leading-5 text-[#7a7267]">{step.detail}</p>{step.actionLabel ? <button type="button" disabled={!step.action} onClick={() => step.action && onAction(step.action)} className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9a5747] disabled:text-[#9c958a]">{step.actionLabel}<ArrowRight className="size-3" /></button> : null}</div>
        </article>)}
      </div>
      <section className="mt-5 overflow-hidden rounded-[24px] bg-[#20372d] p-5 text-[#fffaf2] sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">One story · Different outputs</p><h3 className="mt-2 font-display text-3xl leading-none">Make it fit where you share it.</h3><p className="mt-3 max-w-lg text-xs leading-5 text-[#cbd6d0]">Choose the format first, select what appears, then preview the destination-specific result at 50–200% before sharing or downloading.</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-[18px] bg-[#fff8ec] p-4 text-[#26372f]"><span className="grid size-9 place-items-center rounded-[12px] bg-[#b1604c] text-white"><Image className="size-4" /></span><strong className="mt-3 block text-sm">Image carousel</strong><span className="mt-1 block text-[10px] leading-4 text-[#756d63]">Numbered PNG slides · one moment at a time</span></div>
            <div className="rounded-[18px] border border-white/10 bg-white/8 p-4"><span className="grid size-9 place-items-center rounded-[12px] bg-[#f0c681] text-[#26372f]"><Film className="size-4" /></span><strong className="mt-3 block text-sm">Social video</strong><span className="mt-1 block text-[10px] leading-4 text-[#cbd6d0]">MP4 story · platform-safe pacing and crops</span></div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-[9px] font-bold uppercase tracking-[.1em]"><span className="flex items-center gap-1.5 text-[#f0c681]"><Maximize2 className="size-3" />Preview first</span><span className="rounded-full bg-white/10 px-2.5 py-1.5">Instagram · 4:5</span><span className="rounded-full bg-white/10 px-2.5 py-1.5">TikTok · 9:16</span><span className="rounded-full bg-white/10 px-2.5 py-1.5">LinkedIn · 1:1</span><span className="rounded-full bg-white/10 px-2.5 py-1.5">Pinterest · 2:3</span></div>
      </section>
      <div className="mt-5 flex items-start gap-3 rounded-[20px] border border-[#d6dfd6] bg-[#edf3ed] p-4 text-xs leading-5 text-[#526158]"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#496151]" /><p><strong className="text-[#34443a]">Private by design.</strong> Only members of this shared space can see its moments and stories. Application administrators do not gain access to the space.</p></div>
    </Modal>
  );
}

export function MembersDialog({ open, onClose, spaceId, spaceName, membership, members, invitations, objects, onInvite }: { open: boolean; onClose: () => void; spaceId: string; spaceName: string; membership: Member; members: Member[]; invitations: Invitation[]; objects: MomentObject[]; onInvite: () => void }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (member: Member) => api.removeMember(spaceId, member.userId),
    onSuccess: async (_, member) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["space", spaceId] }), queryClient.invalidateQueries({ queryKey: ["spaces"] })]);
      toast.success(`${member.name} removed from ${spaceName}`);
    },
  });
  function removeMember(member: Member) {
    if (window.confirm(`Remove ${member.name} from ${spaceName}? Their uploaded moments will remain in the space.`)) remove.mutate(member);
  }
  return (
    <Modal open={open} onClose={onClose} title={`People in ${spaceName}`} description="Membership and access are managed separately for every shared space." size="lg">
      <div className="flex flex-col gap-3 rounded-[22px] bg-[#20372d] p-4 text-[#fffaf2] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-[16px] bg-white/10"><UsersRound className="size-5" /></span><div><p className="font-semibold">{members.length} {members.length === 1 ? "person" : "people"} can open this space</p><p className="mt-0.5 text-xs text-[#cbd6d0]">Only the owner can invite or remove members.</p></div></div>{membership.role === "owner" ? <Button className="bg-[#f0c681] text-[#26372f] shadow-none hover:bg-[#f5d99c]" onClick={onInvite}><UserPlus className="size-4" />Invite someone</Button> : null}</div>
      <div className="mt-5 grid gap-3">
        {members.map((member, index) => {
          const contributions = objects.filter((object) => object.uploadedBy === member.userId).length;
          const isCurrent = member.userId === membership.userId;
          return <article key={member.id} className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[#ded2c2] bg-[#fffdf8] p-3 sm:gap-4 sm:p-4">
            <span className={`grid size-12 shrink-0 place-items-center rounded-[17px] text-xs font-bold ${["bg-[#789083] text-white", "bg-[#b1604c] text-white", "bg-[#d7bd96] text-[#34443a]"][index % 3]}`}>{initials(member.name)}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold text-[#26372f]">{member.name}</h3>{isCurrent ? <span className="rounded-full bg-[#e8dfd1] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#677168]">You</span> : null}{member.role === "owner" ? <span className="rounded-full bg-[#dce8dc] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#496151]">Owner</span> : null}</div><p className="truncate text-xs text-[#827a70]">{member.email}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[.1em] text-[#9a5747]">{contributions} {contributions === 1 ? "moment" : "moments"} · Joined {new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(new Date(member.joinedAt))}</p></div>
            {membership.role === "owner" && member.role !== "owner" ? <button type="button" onClick={() => removeMember(member)} disabled={remove.isPending} className="grid size-10 shrink-0 place-items-center rounded-full text-[#9f3f31] hover:bg-[#f8e3dd] disabled:opacity-40" aria-label={`Remove ${member.name}`}>{remove.isPending && remove.variables?.id === member.id ? <Spinner /> : <Trash2 className="size-4" />}</button> : null}
          </article>;
        })}
      </div>
      {invitations.length ? <section className="mt-6 border-t border-[#e0d6c8] pt-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8f5547]">Pending email invitations</p><div className="mt-3 grid gap-2">{invitations.map((invitation) => <div key={invitation.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#f4ede1] px-4 py-3"><span className="truncate text-sm text-[#526158]">{invitation.email}</span><span className="shrink-0 rounded-full bg-[#ead8bd] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#8f5547]">Pending</span></div>)}</div></section> : null}
      {remove.error ? <p className="mt-4 rounded-2xl bg-[#f8e3dd] px-4 py-3 text-sm text-[#8a372b]">{remove.error instanceof ZoMomentsApiError ? remove.error.message : "Could not remove this member"}</p> : null}
    </Modal>
  );
}
