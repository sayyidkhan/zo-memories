import type {
  Album,
  DirectorPlan,
  Avatar,
  Invitation,
  Member,
  MomentObject,
  ShareInvitation,
  Space,
  Story,
  StoryRevision,
} from "@zo-moments/types";
import type { BlobStore } from "./storage/blob-store";
import { JsonCollection } from "./storage/json-collection";

export interface Repositories {
  spaces: JsonCollection<Space>;
  members: JsonCollection<Member>;
  invitations: JsonCollection<Invitation>;
  shareInvitations: JsonCollection<ShareInvitation>;
  albums: JsonCollection<Album>;
  stories: JsonCollection<Story>;
  directorPlans: JsonCollection<DirectorPlan>;
  storyRevisions: JsonCollection<StoryRevision>;
  objects: JsonCollection<MomentObject>;
  avatars: JsonCollection<Avatar>;
}

export function createRepositories(store: BlobStore): Repositories {
  return {
    spaces: new JsonCollection(store, "spaces"),
    members: new JsonCollection(store, "members"),
    invitations: new JsonCollection(store, "invitations"),
    shareInvitations: new JsonCollection(store, "share-invitations"),
    albums: new JsonCollection(store, "albums"),
    stories: new JsonCollection(store, "stories"),
    directorPlans: new JsonCollection(store, "director-plans"),
    storyRevisions: new JsonCollection(store, "story-revisions"),
    objects: new JsonCollection(store, "objects"),
    avatars: new JsonCollection(store, "avatars"),
  };
}
