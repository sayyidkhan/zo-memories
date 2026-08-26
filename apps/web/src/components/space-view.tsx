import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Album as AlbumIcon, BookOpen, Check, CircleHelp, ImagePlus, Images, Search, Sparkles, UserPlus, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { api } from "@zo-moments/sdk";
import type { Member, MomentObject, Story } from "@zo-moments/types";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { initials, monthLabel } from "@/lib/utils";
import { AlbumDialog, InviteDialog, UploadDialog } from "./dialogs";
import { MemoryCard, MemoryPreview } from "./memory-card";
import { StoryDialog, StoryReader, StoryShelf } from "./story-experience";
import { HowItWorksDialog, MembersDialog } from "./space-dialogs";
import { InterfaceTour } from "./interface-tour";
import { Button, EmptyState, Spinner } from "./ui";

const memberColours = [
  "bg-[#789083] text-white",
  "bg-[#b1604c] text-white",
  "bg-[#d7bd96] text-[#34443a]",
  "bg-[#526c60] text-white",
  "bg-[#c28b6e] text-white",
];

function MemberAvatarStack({ members, objects, onOpen }: { members: Member[]; objects: MomentObject[]; onOpen: () => void }) {
  return (
    <div className="flex items-center -space-x-2" aria-label={`${members.length} people share this space`}>
      {members.slice(0, 5).map((member, index) => {
        const contributions = objects.filter((object) => object.uploadedBy === member.userId).length;
        const tooltipId = `member-tooltip-${member.id}`;
        const tooltipPosition = index === 0 ? "left-0" : "left-1/2 -translate-x-1/2";
        const arrowPosition = index === 0 ? "left-4" : "left-1/2 -translate-x-1/2";
        return (
          <button
            key={member.id}
            type="button"
            onClick={onOpen}
            aria-label={`View ${member.name}, ${member.role === "owner" ? "space owner" : "member"}, ${contributions} ${contributions === 1 ? "moment" : "moments"}`}
            aria-describedby={tooltipId}
            className={`group relative grid size-9 place-items-center rounded-full border-2 border-[#f4ede1] text-[10px] font-bold shadow-sm transition hover:z-20 hover:-translate-y-1 hover:scale-110 focus-visible:z-20 focus-visible:-translate-y-1 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9503f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4ede1] ${memberColours[index % memberColours.length]}`}
          >
            {initials(member.name)}
            <span id={tooltipId} role="tooltip" className={`pointer-events-none absolute top-full z-30 mt-3 w-44 -translate-y-1 rounded-[16px] border border-white/10 bg-[#20372d] px-3.5 py-3 text-left font-normal text-[#fffaf2] opacity-0 shadow-[0_14px_36px_rgba(32,55,45,.28)] transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 ${tooltipPosition}`}>
              <span className="block truncate text-xs font-bold">{member.name}</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[.1em] text-[#efc46f]">{member.role === "owner" ? "Space owner" : "Member"} · {contributions} {contributions === 1 ? "moment" : "moments"}</span>
              <span aria-hidden="true" className={`absolute bottom-full size-2 translate-y-1/2 rotate-45 border-l border-t border-white/10 bg-[#20372d] ${arrowPosition}`} />
            </span>
          </button>
        );
      })}
      {members.length > 5 ? <button type="button" onClick={onOpen} className="relative z-10 grid size-9 place-items-center rounded-full border-2 border-[#f4ede1] bg-[#e1d5c5] text-[9px] font-bold text-[#526158] shadow-sm transition hover:-translate-y-1" aria-label={`View ${members.length - 5} more members`}>+{members.length - 5}</button> : null}
    </div>
  );
}

type ChecklistAction = "upload" | "story" | "invite";

function GettingStartedChecklist({ spaceId, momentCount, storyCount, peopleCount, pendingInvites, canInvite, onAction }: { spaceId: string; momentCount: number; storyCount: number; peopleCount: number; pendingInvites: number; canInvite: boolean; onAction: (action: ChecklistAction) => void }) {
  const storageKey = `zo-moments-start-${spaceId}`;
  const [dismissed, setDismissed] = useState(() => window.localStorage.getItem(storageKey) === "done");
  const steps: Array<{ id: string; title: string; promise: string; done: boolean; progress?: string; action: ChecklistAction | null; cta: string; icon: typeof ImagePlus }> = [
    { id: "photos", title: "Add 3 photos", promise: "They become a browsable timeline instantly.", done: momentCount >= 3, progress: `${Math.min(momentCount, 3)}/3`, action: "upload", cta: "Add photos", icon: ImagePlus },
    { id: "story", title: "See your story", promise: "One tap turns them into a finished storybook.", done: storyCount >= 1, action: momentCount >= 2 ? "story" : "upload", cta: momentCount >= 2 ? "Craft it now" : "Add moments first", icon: Sparkles },
    { id: "invite", title: "Invite one person", promise: "A story is better when they can retell it too.", done: peopleCount > 1 || pendingInvites > 0, action: canInvite ? "invite" : null, cta: canInvite ? "Send an invite" : "Owner sends invites", icon: UserPlus },
  ];
  const completed = steps.filter((step) => step.done).length;
  if (dismissed || completed === steps.length) return null;
  const next = steps.find((step) => !step.done);
  return (
    <section aria-label="Getting started checklist" className="mb-8 overflow-hidden rounded-[26px] border border-[#d6c8b3] bg-[#20372d] text-[#fffaf2] shadow-[0_18px_50px_rgba(32,55,45,.16)]">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#f0c681]">Get to your first story · {completed} of 3 done</p>
        <button type="button" onClick={() => { window.localStorage.setItem(storageKey, "done"); setDismissed(true); }} className="grid size-8 shrink-0 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white" aria-label="Dismiss getting started checklist"><X className="size-4" /></button>
      </div>
      <div className="mx-5 mt-2 h-1.5 overflow-hidden rounded-full bg-white/12 sm:mx-6"><div className="h-full rounded-full bg-[#f0c681] transition-all duration-700" style={{ width: `${Math.max(8, (completed / 3) * 100)}%` }} /></div>
      <div className="grid gap-2 p-4 sm:grid-cols-3 sm:gap-3 sm:p-5">
        {steps.map((step, index) => {
          const isNext = step.id === next?.id;
          return (
            <div key={step.id} className={`flex flex-col rounded-[18px] border p-4 transition ${step.done ? "border-white/10 bg-white/5" : isNext ? "border-[#f0c681]/70 bg-white/10" : "border-white/10 bg-white/[.04]"}`}>
              <div className="flex items-center gap-2.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold ${step.done ? "bg-[#f0c681] text-[#20372d]" : "border border-white/25 bg-white/5 text-white/70"}`}>{step.done ? <Check className="size-4" /> : index + 1}</span>
                <p className={`min-w-0 truncate text-sm font-bold ${step.done ? "text-white/55 line-through decoration-white/30" : "text-[#fffaf2]"}`}>{step.title}{step.progress && !step.done ? <span className="ml-2 rounded-full bg-white/12 px-2 py-0.5 text-[9px] font-bold text-[#f0c681]">{step.progress}</span> : null}</p>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-white/60">{step.promise}</p>
              {!step.done && isNext ? <button type="button" disabled={!step.action} onClick={() => step.action && onAction(step.action)} className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f0c681] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#20372d] transition hover:bg-[#f6d795] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/50"><step.icon className="size-3.5" />{step.cta}</button> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SpaceView({ spaceId, isDemo }: { spaceId: string; isDemo: boolean }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<"upload" | "invite" | "album" | "story" | "guide" | "members" | null>(null);
  const [preview, setPreview] = useState<MomentObject | null>(null);
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [revealStoryId, setRevealStoryId] = useState<string | null>(null);
  const [view, setView] = useState<"stories" | "moments">("stories");
  const [tourVersion, setTourVersion] = useState(0);
  const { selectedAlbumId, setSelectedAlbumId, search, setSearch } = useAppStore();
  const deferredSearch = useDeferredValue(search);
  const detail = useQuery({ queryKey: ["space", spaceId], queryFn: () => api.getSpace(spaceId) });
  const allObjects = useQuery({ queryKey: ["objects", spaceId, "all"], queryFn: () => api.listObjects(spaceId) });
  const timelineObjects = useQuery({
    queryKey: ["objects", spaceId, selectedAlbumId, deferredSearch],
    queryFn: () => api.listObjects(spaceId, { ...(selectedAlbumId ? { albumId: selectedAlbumId } : {}), ...(deferredSearch ? { search: deferredSearch } : {}) }),
    enabled: view === "moments",
  });
  const stories = useQuery({ queryKey: ["stories", spaceId], queryFn: () => api.listStories(spaceId) });
  const storyList = stories.data?.stories ?? [];
  const objectList = allObjects.data?.objects ?? [];
  const filteredObjects = timelineObjects.data?.objects ?? [];
  const removeObject = useMutation({
    mutationFn: (object: MomentObject) => api.deleteObject(spaceId, object.id),
    onSuccess: async () => {
      setPreview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["objects", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["stories", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["spaces"] }),
      ]);
      toast.success("Memory removed");
    },
  });
  const removeStory = useMutation({
    mutationFn: (story: Story) => api.deleteStory(spaceId, story.id),
    onSuccess: async () => {
      setOpenStory(null);
      await queryClient.invalidateQueries({ queryKey: ["stories", spaceId] });
      toast.success("Story deleted");
    },
  });
  const createFirstStory = useMutation({
    mutationFn: async () => {
      const { objects } = await api.listObjects(spaceId);
      const selected = objects.filter((object) => object.kind === "photo").sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)).slice(0, 5);
      if (selected.length < 3) throw new Error("Add at least three photos before creating the first story");
      const momentIds = selected.map((object) => object.id);
      const title = "Our first story";
      const { opening } = await api.suggestStoryOpening(spaceId, { title, momentIds });
      const { blueprint } = await api.suggestStoryBlueprint(spaceId, { title, opening, momentIds });
      return api.createStory(spaceId, { title, opening, blueprint, momentIds, style: "auto" });
    },
    onSuccess: async ({ story }) => {
      await queryClient.invalidateQueries({ queryKey: ["stories", spaceId] });
      setRevealStoryId(story.id);
      setOpenStory(story);
      setView("stories");
      toast.success("Your first story is ready to make your own");
    },
    onError: () => toast.error("Your moments are safe. We could not draft the first story yet."),
  });

  if (detail.isPending) return <div className="grid min-h-[70vh] place-items-center text-[#607066]"><Spinner /></div>;
  if (detail.isError || !detail.data) return <EmptyState icon={<Images className="size-7" />} title="This space could not open" body="Refresh the page and try again." />;

  const { space, membership, members, invitations, albums } = detail.data;
  const grouped = filteredObjects.reduce<Record<string, MomentObject[]>>((groups, object) => {
    const month = monthLabel(object.occurredAt);
    (groups[month] ??= []).push(object);
    return groups;
  }, {});

  return (
    <div className="min-w-0 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header data-interface-tour="overview" className="relative overflow-hidden border-b border-[#d9cebe] px-4 pb-5 pt-6 sm:px-8 sm:pb-8 sm:pt-7 lg:px-12 lg:pb-10 lg:pt-11">
        <div className="absolute right-[-5%] top-[-85%] size-80 rounded-full bg-[#d9bea3]/30 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:gap-7 xl:flex-row xl:items-end">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#9a5747]">Shared space</p>
            <h1 className="font-display text-4xl leading-[.96] tracking-[-.045em] text-[#26372f] sm:text-6xl">{space.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-[#746d63]">
              {space.description ? <p className="basis-full">{space.description}</p> : null}
              <button data-interface-tour="people" type="button" onClick={() => setDialog("members")} className="flex flex-wrap items-center gap-2 rounded-full text-left transition hover:text-[#34443a]" aria-label="View and manage space members"><span className="flex -space-x-1.5">{members.slice(0, 3).map((member, index) => <span key={member.id} className={`grid size-7 place-items-center rounded-full border-2 border-[#f4ede1] text-[8px] font-bold ${["bg-[#789083] text-white", "bg-[#b1604c] text-white", "bg-[#d7bd96] text-[#34443a]"][index % 3]}`}>{initials(member.name)}</span>)}</span><span className="font-semibold">{members.map((member) => member.name.split(" ")[0]).join(", ")}</span><span className="text-xs underline decoration-[#b9aa97] underline-offset-4">Manage</span></button>
              <span className="h-4 w-px bg-[#cfc2b0]" aria-hidden="true" />
              <button type="button" onClick={() => setTourVersion((version) => version + 1)} className="inline-flex h-9 items-center gap-2 rounded-full bg-[#26372f] px-3 text-xs font-bold text-[#fffaf2] shadow-[0_7px_20px_rgba(56,43,26,.12)] transition hover:-translate-y-0.5 hover:bg-[#18251f]"><CircleHelp className="size-4" />Take interface tour</button>
              <button type="button" onClick={() => setDialog("guide")} className="group inline-flex h-9 items-center gap-2 rounded-full border border-[#cab793] bg-[#fffaf2] px-3 text-xs font-bold text-[#34443a] shadow-[0_7px_20px_rgba(56,43,26,.08)] transition hover:-translate-y-0.5 hover:border-[#a9503f] hover:text-[#a9503f]"><CircleHelp className="size-4" />{isDemo ? "How this demo works" : "Learn how it works"}<span className="rounded-full bg-[#f0c681] px-2 py-1 text-[8px] tracking-[.1em] text-[#26372f]">01–07</span></button>
            </div>
          </div>
          <div data-interface-tour="create" className="hidden gap-2 sm:flex sm:flex-nowrap">
            <Button className="whitespace-nowrap" variant="secondary" onClick={() => setDialog("upload")}><ImagePlus className="size-4" />Add moments</Button>
            <Button className="whitespace-nowrap" onClick={() => setDialog("story")} disabled={objectList.length < 2}><Sparkles className="size-4" />Craft a story</Button>
          </div>
        </div>
      </header>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 border-b border-[#ddd2c2] bg-[#f4ede1]/95 px-4 py-3 backdrop-blur-xl sm:top-16 sm:px-8 sm:py-4 lg:top-0 lg:px-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid max-w-full grid-cols-2 gap-2 md:flex md:overflow-x-auto md:pb-1 no-scrollbar">
            <button data-interface-tour="stories" onClick={() => setView("stories")} className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition md:shrink-0 ${view === "stories" ? "bg-[#26372f] text-[#fffaf2]" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}><BookOpen className="size-4" />Stories{storyList.length ? <span className="opacity-65">{storyList.length}</span> : null}</button>
            <button data-interface-tour="moments" onClick={() => setView("moments")} className={`flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition md:shrink-0 ${view === "moments" ? "bg-[#26372f] text-[#fffaf2]" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}><Images className="size-4" />Moments <span className="opacity-65">{objectList.length}</span></button>
          </div>
          {view === "moments" ? (
            <label className="relative block md:w-64">
              <Search className="absolute left-4 top-3 size-4 text-[#827a70]" />
              <input aria-label="Search moments" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search moments" className="h-10 w-full rounded-full border border-[#d5c9b8] bg-[#fffaf2]/80 pl-10 pr-4 text-sm outline-none focus:border-[#718277]" />
            </label>
          ) : null}
        </div>
      </div>

      <main className="px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-11">
        {!isDemo && !allObjects.isPending && !stories.isPending ? <GettingStartedChecklist spaceId={spaceId} momentCount={objectList.length} storyCount={storyList.length} peopleCount={members.length} pendingInvites={invitations.length} canInvite={membership.role === "owner"} onAction={(action) => setDialog(action)} /> : null}
        {invitations.length ? (
          <div className="mb-8 flex items-center gap-4 rounded-[22px] border border-[#d9cbb8] bg-[#fff8ec] px-5 py-4 text-sm text-[#5d665f]">
            <div className="flex -space-x-2">{invitations.slice(0, 3).map((invite) => <span key={invite.id} className="grid size-9 place-items-center rounded-full border-2 border-[#fff8ec] bg-[#cfb99b] text-xs font-bold text-[#34443a]">{invite.email[0]?.toUpperCase()}</span>)}</div>
            <p><strong className="text-[#34443a]">{invitations.length} pending {invitations.length === 1 ? "invite" : "invites"}.</strong> Access starts when they sign in with the invited email.</p>
          </div>
        ) : null}

        {view === "stories" ? (
          <>
            {stories.isPending || allObjects.isPending ? <div className="grid min-h-80 place-items-center text-[#607066]"><Spinner /></div> : <StoryShelf stories={storyList} objects={objectList} isDemo={isDemo} onOpen={setOpenStory} onCreate={() => setDialog("story")} onAddMoments={() => setDialog("upload")} />}
          </>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setSelectedAlbumId(null)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedAlbumId === null ? "bg-[#a9503f] text-white" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}>All moments</button>
                {albums.map((album) => <button key={album.id} onClick={() => setSelectedAlbumId(album.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedAlbumId === album.id ? "bg-[#a9503f] text-white" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}>{album.name}</button>)}
                <button onClick={() => setDialog("album")} className="flex shrink-0 items-center gap-2 rounded-full border border-dashed border-[#b8a995] px-4 py-2 text-sm font-semibold text-[#677168]"><AlbumIcon className="size-4" />New album</button>
              </div>
              <div className="flex items-center justify-between gap-5 lg:justify-end"><MemberAvatarStack members={members} objects={objectList} onOpen={() => setDialog("members")} /><p className="text-xs font-medium text-[#837b71]">{filteredObjects.length} {filteredObjects.length === 1 ? "memory" : "memories"}</p></div>
            </div>

            {timelineObjects.isPending ? <div className="grid min-h-80 place-items-center text-[#607066]"><Spinner /></div> : null}
            {!timelineObjects.isPending && !filteredObjects.length ? <EmptyState icon={<ImagePlus className="size-7" />} title={search || selectedAlbumId ? "No moments found" : "Your story starts here"} body={search || selectedAlbumId ? "Try another search or return to all moments." : "Add a photo, video, voice note, or document. The first memory takes less than 30 seconds."} action={search || selectedAlbumId ? <Button variant="secondary" onClick={() => { setSearch(""); setSelectedAlbumId(null); }}>Show all moments</Button> : <Button onClick={() => setDialog("upload")}><ImagePlus className="size-4" />Add the first memory</Button>} /> : null}
            <div className="space-y-14">{Object.entries(grouped).map(([month, monthObjects]) => <section key={month}><div className="mb-5 flex items-baseline gap-4"><h2 className="font-display text-3xl text-[#34443a]">{month}</h2><span className="text-xs text-[#91897d]">{monthObjects.length} {monthObjects.length === 1 ? "moment" : "moments"}</span></div><div className="grid grid-cols-2 items-start gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{monthObjects.map((object, index) => <MemoryCard key={object.id} object={object} uploader={members.find((member) => member.userId === object.uploadedBy)} index={index} onOpen={() => setPreview(object)} />)}</div></section>)}</div>
          </>
        )}
      </main>

      <div data-interface-tour="create" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d8cdbc] bg-[#fffaf2]/96 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_42px_rgba(46,39,30,.12)] backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12" variant="secondary" onClick={() => setDialog("upload")}><ImagePlus className="size-4" />Add moments</Button>
          <Button className="h-12" onClick={() => setDialog("story")} disabled={objectList.length < 2}><Sparkles className="size-4" />Craft a story</Button>
        </div>
      </div>

      <UploadDialog open={dialog === "upload"} onClose={() => setDialog(null)} spaceId={spaceId} albums={albums} onUploaded={({ photoCount }) => {
        const existingPhotos = objectList.filter((object) => object.kind === "photo").length;
        if (!isDemo && !storyList.length && photoCount && existingPhotos < 3 && existingPhotos + photoCount >= 3 && existingPhotos + photoCount <= 5) createFirstStory.mutate();
      }} />
      <InviteDialog open={dialog === "invite"} onClose={() => setDialog(null)} spaceId={spaceId} />
      <AlbumDialog open={dialog === "album"} onClose={() => setDialog(null)} spaceId={spaceId} />
      <StoryDialog
        open={dialog === "story"}
        onClose={() => setDialog(null)}
        spaceId={spaceId}
        objects={objectList}
        story={null}
        onSaved={(story) => {
          setRevealStoryId(story.id);
          setOpenStory(story);
          setView("stories");
          setDialog(null);
        }}
      />
      <HowItWorksDialog open={dialog === "guide"} onClose={() => setDialog(null)} members={members} momentCount={objectList.length} storyCount={storyList.length} albumCount={albums.length} canInvite={membership.role === "owner"} onAction={(action) => { if (action === "moments" || action === "stories") { setView(action); setDialog(null); return; } setDialog(action); }} />
      <MembersDialog open={dialog === "members"} onClose={() => setDialog(null)} spaceId={spaceId} spaceName={space.name} membership={membership} members={members} invitations={invitations} objects={objectList} onInvite={() => setDialog("invite")} />
      <MemoryPreview object={preview} uploader={members.find((member) => member.userId === preview?.uploadedBy)} onClose={() => setPreview(null)} onDelete={(object) => removeObject.mutate(object)} />
      <StoryReader story={openStory} objects={objectList} canEdit={!isDemo && Boolean(openStory && (membership.role === "owner" || openStory.createdBy === membership.userId))} canDelete={Boolean(openStory && (membership.role === "owner" || openStory.createdBy === membership.userId))} reveal={Boolean(openStory && openStory.id === revealStoryId)} onClose={() => { setRevealStoryId(null); setOpenStory(null); }} onStoryChanged={setOpenStory} onDelete={(story) => { if (window.confirm("Delete this story? The original moments will stay in the space.")) removeStory.mutate(story); }} />
      <InterfaceTour spaceId={spaceId} restartKey={tourVersion} onViewChange={setView} />
    </div>
  );
}
