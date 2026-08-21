import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ZoMomentsApiError } from "@zo-moments/sdk";
import type { Invitation, Member, MomentObject } from "@zo-moments/types";
import { toast } from "sonner";
import { initials } from "@/lib/utils";
import { CanvasIllustration, ExportIllustration, InviteMembersIllustration, LibraryIllustration, SpaceSetupIllustration, StoryBuilderIllustration, UploadMomentsIllustration } from "./onboarding-illustrations";
import { Button, Modal, Spinner } from "./ui";

type GuideAction = "invite" | "upload" | "story" | "moments" | "stories";

export function HowItWorksDialog({ open, onClose, members, momentCount, storyCount, albumCount, canInvite, onAction }: { open: boolean; onClose: () => void; members: Member[]; momentCount: number; storyCount: number; albumCount: number; canInvite: boolean; onAction: (action: GuideAction) => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const guideRef = useRef<HTMLDivElement>(null);
  const steps = [
    { number: "01", title: "Create a private space", summary: "Give one relationship, family, friendship, or journey a home of its own.", instructions: ["Name the shared space and add a short description.", "Use a separate space when the people or purpose changes."], outcome: "A private boundary containing its own members, moments, albums, and stories.", done: true, action: null, actionLabel: null, illustration: <SpaceSetupIllustration /> },
    { number: "02", title: "Invite and manage people", summary: "Bring in everyone who should contribute to this shared chapter.", instructions: ["Open the member list and create a single-use invitation link.", "Share it through WhatsApp, Telegram, SMS, or the device share sheet.", "Owners can review and remove members later."], outcome: "Every accepted member can add moments, while the owner controls access.", done: members.length > 1, action: canInvite ? "invite" as const : null, actionLabel: canInvite ? "Invite someone now" : "Only the owner can invite", illustration: <InviteMembersIllustration /> },
    { number: "03", title: "Upload moments together", summary: "Add one memory or an entire day without processing files one by one.", instructions: ["Select up to 25 photos, videos, voice notes, PDFs, or documents.", "Write a different caption for each file.", "Apply a shared date and album before uploading the batch."], outcome: "Original files stay private and keep the context needed for the timeline and story builder.", done: momentCount > 0, action: "upload" as const, actionLabel: "Add moments now", illustration: <UploadMomentsIllustration /> },
    { number: "04", title: "Organise and rediscover", summary: "Use the Moments view as a living timeline, not a flat storage folder.", instructions: ["Switch from Stories to Moments to see uploads grouped by month.", "Filter with albums or search by filename and caption.", "Open any item to preview it, see who shared it, download it, or remove it."], outcome: "Years of mixed media remain browsable by time, album, person, and context.", done: momentCount > 0 || albumCount > 0, action: "moments" as const, actionLabel: "Open the Moments library", illustration: <LibraryIllustration /> },
    { number: "05", title: "Shape moments into a story", summary: "Turn a selection of files into one coherent journey with chapters and meaning.", instructions: ["Name the chapter and select at least two moments.", "Choose Classic, Scrapbook, Cinematic, or let Auto decide.", "Write the opening yourself or ask AI to draft the opening and chapter blueprint."], outcome: "One canonical story that keeps its meaning even when its presentation changes.", done: storyCount > 0, action: momentCount >= 2 ? "story" as const : "upload" as const, actionLabel: momentCount >= 2 ? "Craft a story now" : "Add two moments first", illustration: <StoryBuilderIllustration /> },
    { number: "06", title: "Edit the finished canvas", summary: "A generated story is a starting point, not a locked result.", instructions: ["Open a story and choose Edit.", "Change the title, place, date, opening, scene titles, and scene details directly on the canvas.", "Let autosave capture changes, or restore an earlier snapshot from Versions."], outcome: "A polished story shaped by the people who actually lived it, without altering source moments.", done: storyCount > 0, action: storyCount > 0 ? "stories" as const : "story" as const, actionLabel: storyCount > 0 ? "Open a story to edit" : "Create a story first", illustration: <CanvasIllustration /> },
    { number: "07", title: "Preview and share anywhere", summary: "Create output for the destination instead of exporting the same generic file everywhere.", instructions: ["Choose an image carousel or vertical social video.", "Pick the platform and placement to adapt crop, safe area, dimensions, and pacing.", "Preview at 50–200%, edit the caption, then share directly or download the reusable master."], outcome: "A numbered JPEG carousel or H.264 MP4 tailored for Instagram, TikTok, LinkedIn, WhatsApp, and more.", done: storyCount > 0, action: storyCount > 0 ? "stories" as const : "story" as const, actionLabel: storyCount > 0 ? "Open a story to share" : "Create a story first", illustration: <ExportIllustration /> },
  ];
  const currentStep = steps[activeStep] ?? steps[0]!;
  useEffect(() => {
    if (!open) return;
    const firstIncomplete = steps.findIndex((step) => !step.done);
    setActiveStep(firstIncomplete < 0 ? 0 : firstIncomplete);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const panel = guideRef.current?.closest(".modal-panel");
    if (panel instanceof HTMLElement) panel.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep, open]);
  return (
    <Modal open={open} onClose={onClose} title="Learn Zo Moments" description="Seven guided steps from a private shared space to editable, social-ready stories." size="xl">
      <div ref={guideRef} className="relative z-20 mb-6 rounded-[24px] bg-[#20372d] px-5 py-4 text-[#fffaf2] sm:flex sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#f0c681]">Your Zo Moments journey</p><p className="mt-1 text-sm text-[#d7dfda]">{members.length} people · {momentCount} moments · {albumCount} {albumCount === 1 ? "album" : "albums"} · {storyCount} {storyCount === 1 ? "story" : "stories"}</p></div><div className="mt-4 grid grid-cols-7 gap-1.5 sm:mt-0">{steps.map((step, index) => {
        const tooltipPosition = index === 0 ? "left-0" : index === steps.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
        return <button key={step.number} type="button" onClick={() => setActiveStep(index)} aria-label={`Open step ${step.number}: ${step.title}`} aria-current={index === activeStep ? "step" : undefined} className={`group relative grid size-9 place-items-center rounded-full border text-[9px] font-bold transition ${index === activeStep ? "border-white bg-white text-[#20372d] shadow-[0_0_0_3px_rgba(240,198,129,.28)]" : step.done ? "border-[#f0c681] bg-[#f0c681] text-[#20372d]" : "border-white/20 bg-white/5 text-white/55"}`}><span role="tooltip" className={`pointer-events-none absolute top-full z-20 mt-2 whitespace-nowrap rounded-full bg-[#fffaf2] px-2.5 py-1.5 text-[8px] font-bold text-[#26372f] shadow-[0_8px_24px_rgba(0,0,0,.22)] transition-opacity ${tooltipPosition} ${index === activeStep ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>{step.title}</span>{step.number}</button>;
      })}</div></div>
      <div className="overflow-hidden rounded-[26px] border border-[#ded2c2] bg-[#f8f1e7]">
        <article key={currentStep.number} className="onboarding-guide grid gap-5 p-4 sm:p-6 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:gap-8">
          <div>{currentStep.illustration}</div>
          <div><div className="flex items-center justify-between gap-3"><span className="inline-flex items-baseline gap-1.5 rounded-full bg-[#26372f] px-3 py-1.5 text-[#fffaf2]"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-[#f0c681]">Step</span><strong className="font-display text-lg leading-none">{currentStep.number}</strong></span><span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.12em] ${currentStep.done ? "text-[#587164]" : "text-[#9a5747]"}`}>{currentStep.done ? <><Check className="size-3.5" /> Ready</> : "Set this up"}</span></div><h3 className="mt-4 font-display text-3xl leading-none text-[#26372f]">{currentStep.title}</h3><p className="mt-3 text-sm font-semibold leading-5 text-[#526158]">{currentStep.summary}</p><div className="mt-4 rounded-[18px] bg-[#efe6d8] p-4"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#9a5747]">How to use it</p><ol className="mt-2 grid gap-2">{currentStep.instructions.map((instruction, index) => <li key={instruction} className="flex gap-2 text-[11px] leading-4 text-[#625f58]"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#26372f] text-[8px] font-bold text-white">{index + 1}</span><span>{instruction}</span></li>)}</ol></div><p className="mt-3 border-l-2 border-[#a9503f] pl-3 text-[11px] leading-5 text-[#6f685f]"><strong className="text-[#34443a]">What you get:</strong> {currentStep.outcome}</p>{currentStep.actionLabel ? <button type="button" disabled={!currentStep.action} onClick={() => currentStep.action && onAction(currentStep.action)} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#a9503f] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[.12em] text-white transition hover:bg-[#8f493b] disabled:bg-[#aaa197]">{currentStep.actionLabel}<ArrowRight className="size-3" /></button> : null}</div>
        </article>
        <div className="flex items-center justify-between gap-3 border-t border-[#ded2c2] bg-[#fffaf2] px-4 py-3 sm:px-6"><Button variant="ghost" className="px-3" disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(0, step - 1))}><ArrowLeft className="size-4" />Back</Button><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#837a6e]">{activeStep + 1} of {steps.length}</span><Button className="px-4" onClick={() => activeStep === steps.length - 1 ? onClose() : setActiveStep((step) => Math.min(steps.length - 1, step + 1))}>{activeStep === steps.length - 1 ? "Finish" : <><span className="sm:hidden">Next</span><span className="hidden sm:inline">Next: {steps[activeStep + 1]?.title}</span></>}<ArrowRight className="size-4" /></Button></div>
      </div>
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
