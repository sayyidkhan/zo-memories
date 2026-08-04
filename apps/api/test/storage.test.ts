import { describe, expect, test } from "bun:test";
import { MemoryBlobStore } from "../src/storage/blob-store";
import { JsonCollection } from "../src/storage/json-collection";
import { matchesWhere } from "../src/storage/auth-adapter";

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
});
