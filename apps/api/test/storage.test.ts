import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileSystemBlobStore, MemoryBlobStore } from "../src/storage/blob-store";
import { JsonCollection } from "../src/storage/json-collection";
import { matchesWhere } from "../src/storage/auth-adapter";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("object storage records", () => {
  test("writes, lists, and deletes isolated JSON records", async () => {
    const store = new MemoryBlobStore();
    const records = new JsonCollection<{ id: string; name: string }>(store, "test");

    await records.put({ id: "one", name: "First" });
    await records.put({ id: "two", name: "Second" });

    expect(await records.get("one")).toEqual({ id: "one", name: "First" });
    expect(await records.list()).toHaveLength(2);
    expect(await records.deleteWhere((record) => record.name.startsWith("S"))).toBe(1);
    expect(await records.list()).toEqual([{ id: "one", name: "First" }]);
  });

  test("evaluates Better Auth query operators", () => {
    const record = { id: "user-1", email: "Person@Example.com", age: 32 };
    expect(matchesWhere(record, [{ field: "email", value: "person@example.com", operator: "eq", connector: "AND", mode: "insensitive" }])).toBe(true);
    expect(matchesWhere(record, [{ field: "age", value: 21, operator: "gt", connector: "AND", mode: "sensitive" }])).toBe(true);
    expect(matchesWhere(record, [{ field: "id", value: ["user-1", "user-2"], operator: "in", connector: "AND", mode: "sensitive" }])).toBe(true);
  });

  test("persists blobs on the filesystem and rejects traversal", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "zo-moments-"));
    temporaryDirectories.push(root);
    const store = new FileSystemBlobStore(root);

    await store.put("zo-moments/media/space/photo.jpg", new Uint8Array([1, 2, 3]));

    expect(await store.list("zo-moments/media/")).toEqual(["zo-moments/media/space/photo.jpg"]);
    expect(new Uint8Array(await (await store.get("zo-moments/media/space/photo.jpg"))!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(() => store.get("../outside")).toThrow("Invalid storage key");

    await store.delete("zo-moments/media/space/photo.jpg");
    expect(await store.get("zo-moments/media/space/photo.jpg")).toBeNull();
  });
});
