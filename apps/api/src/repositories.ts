import type {
  Album,
  Invitation,
  Member,
  MomentObject,
  Space,
} from "@zo-moments/types";
import type { BlobStore } from "./storage/blob-store";
import { JsonCollection } from "./storage/json-collection";

export interface Repositories {
  spaces: JsonCollection<Space>;
  members: JsonCollection<Member>;
  invitations: JsonCollection<Invitation>;
  albums: JsonCollection<Album>;
  objects: JsonCollection<MomentObject>;
}

export function createRepositories(store: BlobStore): Repositories {
  return {
    spaces: new JsonCollection(store, "spaces"),
    members: new JsonCollection(store, "members"),
    invitations: new JsonCollection(store, "invitations"),
    albums: new JsonCollection(store, "albums"),
    objects: new JsonCollection(store, "objects"),
  };
}
