import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Album as AlbumIcon, BookOpen, CircleHelp, ImagePlus, Images, Search, Sparkles, UsersRound } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { api } from "@zo-moments/sdk";
import type { MomentObject, Story } from "@zo-moments/types";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { initials, monthLabel } from "@/lib/utils";
import { AlbumDialog, InviteDialog, UploadDialog } from "./dialogs";
import { MemoryCard, MemoryPreview } from "./memory-card";
import { StoryDialog, StoryReader, StoryShelf } from "./story-experience";
import { HowItWorksDialog, MembersDialog } from "./space-dialogs";
import { Button, EmptyState, Spinner } from "./ui";

export function SpaceView({ spaceId }: { spaceId: string }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<"upload" | "invite" | "album" | "story" | "guide" | "members" | null>(null);
  const [preview, setPreview] = useState<MomentObject | null>(null);
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [view, setView] = useState<"stories" | "moments">("stories");
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

  if (detail.isPending) return <div className="grid min-h-[70vh] place-items-center text-[#607066]"><Spinner /></div>;
  if (detail.isError || !detail.data) return <EmptyState icon={<Images className="size-7" />} title="This space could not open" body="Refresh the page and try again." />;

  const { space, membership, members, invitations, albums } = detail.data;
  const storyList = stories.data?.stories ?? [];
  const objectList = allObjects.data?.objects ?? [];
  const filteredObjects = timelineObjects.data?.objects ?? [];
  const grouped = filteredObjects.reduce<Record<string, MomentObject[]>>((groups, object) => {
    const month = monthLabel(object.occurredAt);
    (groups[month] ??= []).push(object);
    return groups;
  }, {});

  return (
    <div className="min-w-0">
      <header className="relative overflow-hidden border-b border-[#d9cebe] px-5 pb-8 pt-7 sm:px-8 lg:px-12 lg:pb-10 lg:pt-11">
        <div className="absolute right-[-5%] top-[-85%] size-80 rounded-full bg-[#d9bea3]/30 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#9a5747]">Shared space</p>
            <h1 className="font-display text-5xl leading-none tracking-[-.045em] text-[#26372f] sm:text-6xl">{space.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#746d63]">
              {space.description ? <p>{space.description}</p> : null}
              <button type="button" onClick={() => setDialog("members")} className="flex flex-wrap items-center gap-2 rounded-full text-left transition hover:text-[#34443a]" aria-label="View and manage space members"><span className="flex -space-x-1.5">{members.slice(0, 3).map((member, index) => <span key={member.id} className={`grid size-7 place-items-center rounded-full border-2 border-[#f4ede1] text-[8px] font-bold ${["bg-[#789083] text-white", "bg-[#b1604c] text-white", "bg-[#d7bd96] text-[#34443a]"][index % 3]}`}>{initials(member.name)}</span>)}</span><span className="font-semibold">{members.map((member) => member.name.split(" ")[0]).join(", ")}</span><span className="text-xs underline decoration-[#b9aa97] underline-offset-4">Manage</span></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDialog("guide")}><CircleHelp className="size-4" />How it works</Button>
            <Button variant="secondary" onClick={() => setDialog("members")}><UsersRound className="size-4" />People</Button>
            <Button variant="secondary" onClick={() => setDialog("upload")}><ImagePlus className="size-4" />Add moments</Button>
            <Button onClick={() => setDialog("story")} disabled={objectList.length < 2}><Sparkles className="size-4" />Craft a story</Button>
          </div>
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-[#ddd2c2] bg-[#f4ede1]/90 px-5 py-4 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button onClick={() => setView("stories")} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view === "stories" ? "bg-[#26372f] text-[#fffaf2]" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}><BookOpen className="size-4" />Stories{storyList.length ? <span className="opacity-65">{storyList.length}</span> : null}</button>
            <button onClick={() => setView("moments")} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${view === "moments" ? "bg-[#26372f] text-[#fffaf2]" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}><Images className="size-4" />Moments <span className="opacity-65">{objectList.length}</span></button>
          </div>
          {view === "moments" ? (
            <label className="relative block md:w-64">
              <Search className="absolute left-4 top-3 size-4 text-[#827a70]" />
              <input aria-label="Search moments" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search moments" className="h-10 w-full rounded-full border border-[#d5c9b8] bg-[#fffaf2]/80 pl-10 pr-4 text-sm outline-none focus:border-[#718277]" />
            </label>
          ) : null}
        </div>
      </div>

      <main className="px-5 py-8 sm:px-8 lg:px-12 lg:py-11">
        {invitations.length ? (
          <div className="mb-8 flex items-center gap-4 rounded-[22px] border border-[#d9cbb8] bg-[#fff8ec] px-5 py-4 text-sm text-[#5d665f]">
            <div className="flex -space-x-2">{invitations.slice(0, 3).map((invite) => <span key={invite.id} className="grid size-9 place-items-center rounded-full border-2 border-[#fff8ec] bg-[#cfb99b] text-xs font-bold text-[#34443a]">{invite.email[0]?.toUpperCase()}</span>)}</div>
            <p><strong className="text-[#34443a]">{invitations.length} pending {invitations.length === 1 ? "invite" : "invites"}.</strong> Access starts when they sign in with the invited email.</p>
          </div>
        ) : null}

        {view === "stories" ? (
          <>
            {stories.isPending || allObjects.isPending ? <div className="grid min-h-80 place-items-center text-[#607066]"><Spinner /></div> : <StoryShelf stories={storyList} objects={objectList} onOpen={setOpenStory} onCreate={() => setDialog("story")} onAddMoments={() => setDialog("upload")} />}
          </>
        ) : (
          <>
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setSelectedAlbumId(null)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedAlbumId === null ? "bg-[#a9503f] text-white" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}>All moments</button>
                {albums.map((album) => <button key={album.id} onClick={() => setSelectedAlbumId(album.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedAlbumId === album.id ? "bg-[#a9503f] text-white" : "bg-[#e8dfd1] text-[#58645c] hover:bg-[#ddd2c2]"}`}>{album.name}</button>)}
                <button onClick={() => setDialog("album")} className="flex shrink-0 items-center gap-2 rounded-full border border-dashed border-[#b8a995] px-4 py-2 text-sm font-semibold text-[#677168]"><AlbumIcon className="size-4" />New album</button>
              </div>
              <div className="flex items-center justify-between gap-5 lg:justify-end"><div className="flex items-center -space-x-2">{members.slice(0, 5).map((member) => <span key={member.id} title={member.name} className="grid size-9 place-items-center rounded-full border-2 border-[#f4ede1] bg-[#789083] text-[10px] font-bold text-white">{initials(member.name)}</span>)}</div><p className="text-xs font-medium text-[#837b71]">{filteredObjects.length} {filteredObjects.length === 1 ? "memory" : "memories"}</p></div>
            </div>

            {timelineObjects.isPending ? <div className="grid min-h-80 place-items-center text-[#607066]"><Spinner /></div> : null}
            {!timelineObjects.isPending && !filteredObjects.length ? <EmptyState icon={<ImagePlus className="size-7" />} title={search || selectedAlbumId ? "No moments found" : "Your story starts here"} body={search || selectedAlbumId ? "Try another search or return to all moments." : "Add a photo, video, voice note, or document. The first memory takes less than 30 seconds."} action={search || selectedAlbumId ? <Button variant="secondary" onClick={() => { setSearch(""); setSelectedAlbumId(null); }}>Show all moments</Button> : <Button onClick={() => setDialog("upload")}><ImagePlus className="size-4" />Add the first memory</Button>} /> : null}
            <div className="space-y-14">{Object.entries(grouped).map(([month, monthObjects]) => <section key={month}><div className="mb-5 flex items-baseline gap-4"><h2 className="font-display text-3xl text-[#34443a]">{month}</h2><span className="text-xs text-[#91897d]">{monthObjects.length} {monthObjects.length === 1 ? "moment" : "moments"}</span></div><div className="grid grid-cols-2 items-start gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{monthObjects.map((object, index) => <MemoryCard key={object.id} object={object} uploader={members.find((member) => member.userId === object.uploadedBy)} index={index} onOpen={() => setPreview(object)} />)}</div></section>)}</div>
          </>
        )}
      </main>

      <UploadDialog open={dialog === "upload"} onClose={() => setDialog(null)} spaceId={spaceId} albums={albums} />
      <InviteDialog open={dialog === "invite"} onClose={() => setDialog(null)} spaceId={spaceId} />
      <AlbumDialog open={dialog === "album"} onClose={() => setDialog(null)} spaceId={spaceId} />
      <StoryDialog open={dialog === "story"} onClose={() => setDialog(null)} spaceId={spaceId} objects={objectList} onCreated={(story) => { setOpenStory(story); setView("stories"); }} />
      <HowItWorksDialog open={dialog === "guide"} onClose={() => setDialog(null)} members={members} momentCount={objectList.length} storyCount={storyList.length} canInvite={membership.role === "owner"} onAction={(action) => setDialog(action)} />
      <MembersDialog open={dialog === "members"} onClose={() => setDialog(null)} spaceId={spaceId} spaceName={space.name} membership={membership} members={members} invitations={invitations} objects={objectList} onInvite={() => setDialog("invite")} />
      <MemoryPreview object={preview} uploader={members.find((member) => member.userId === preview?.uploadedBy)} onClose={() => setPreview(null)} onDelete={(object) => removeObject.mutate(object)} />
      <StoryReader story={openStory} objects={objectList} members={members} canDelete={Boolean(openStory && (membership.role === "owner" || openStory.createdBy === membership.userId))} onClose={() => setOpenStory(null)} onDelete={(story) => { if (window.confirm("Delete this story? The original moments will stay in the space.")) removeStory.mutate(story); }} />
    </div>
  );
}
