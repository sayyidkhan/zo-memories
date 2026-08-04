import { createAdapterFactory, type CustomAdapter } from "better-auth/adapters";
import type { BlobStore } from "./blob-store";
import { JsonCollection } from "./json-collection";

interface AuthRecord {
  id: string;
  [key: string]: unknown;
}

interface WhereClause {
  field: string;
  value: string | number | boolean | string[] | number[] | Date | null;
  operator: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in" | "contains" | "starts_with" | "ends_with";
  connector: "AND" | "OR";
  mode: "sensitive" | "insensitive";
}

function comparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function matchesClause(record: AuthRecord, clause: WhereClause): boolean {
  let left = comparable(record[clause.field]);
  let right = comparable(clause.value);

  if (clause.mode === "insensitive" && typeof left === "string") left = left.toLowerCase();
  if (clause.mode === "insensitive" && typeof right === "string") right = right.toLowerCase();

  switch (clause.operator) {
    case "eq":
      return left === right;
    case "ne":
      return left !== right;
    case "lt":
      return left !== undefined && (left as string | number) < (right as string | number);
    case "lte":
      return left !== undefined && (left as string | number) <= (right as string | number);
    case "gt":
      return left !== undefined && (left as string | number) > (right as string | number);
    case "gte":
      return left !== undefined && (left as string | number) >= (right as string | number);
    case "in":
      return Array.isArray(right) && right.includes(left as never);
    case "not_in":
      return Array.isArray(right) && !right.includes(left as never);
    case "contains":
      return typeof left === "string" && typeof right === "string" && left.includes(right);
    case "starts_with":
      return typeof left === "string" && typeof right === "string" && left.startsWith(right);
    case "ends_with":
      return typeof left === "string" && typeof right === "string" && left.endsWith(right);
  }
}

export function matchesWhere(record: AuthRecord, where: WhereClause[] | undefined): boolean {
  if (!where?.length) return true;
  let result = matchesClause(record, where[0]!);
  for (let index = 1; index < where.length; index += 1) {
    const clause = where[index]!;
    result = clause.connector === "OR"
      ? result || matchesClause(record, clause)
      : result && matchesClause(record, clause);
  }
  return result;
}

export const objectStoreAdapter = (store: BlobStore) =>
  createAdapterFactory({
    config: {
      adapterId: "zo-object-store",
      adapterName: "Zo Object Store",
      supportsNumericIds: false,
      supportsJSON: true,
      supportsDates: false,
      supportsBooleans: true,
      supportsArrays: true,
      transaction: false,
    },
    adapter: () => {
      const collection = (model: string) => new JsonCollection<AuthRecord>(store, `auth/${model}`);

      return {
        create: async ({ model, data }: any) => collection(model).put(data),
        findOne: async ({ model, where }: any) => collection(model).findOne((row) => matchesWhere(row, where)),
        findMany: async ({ model, where, limit, offset = 0, sortBy }: any) => {
          let rows = await collection(model).find((row) => matchesWhere(row, where));
          if (sortBy) {
            rows = rows.sort((a, b) => {
              const left = comparable(a[sortBy.field]);
              const right = comparable(b[sortBy.field]);
              const order = String(left ?? "").localeCompare(String(right ?? ""));
              return sortBy.direction === "desc" ? -order : order;
            });
          }
          return rows.slice(offset, offset + limit);
        },
        count: async ({ model, where }: any) => (await collection(model).find((row) => matchesWhere(row, where))).length,
        update: async ({ model, where, update }: any) => {
          const repo = collection(model);
          const row = await repo.findOne((candidate) => matchesWhere(candidate, where));
          return row ? repo.put({ ...row, ...update }) : null;
        },
        updateMany: async ({ model, where, update }: any) => {
          const repo = collection(model);
          const rows = await repo.find((candidate) => matchesWhere(candidate, where));
          await Promise.all(rows.map((row) => repo.put({ ...row, ...update })));
          return rows.length;
        },
        delete: async ({ model, where }: any) => {
          const repo = collection(model);
          const row = await repo.findOne((candidate) => matchesWhere(candidate, where));
          if (row) await repo.delete(row.id);
        },
        deleteMany: async ({ model, where }: any) => collection(model).deleteWhere((row) => matchesWhere(row, where)),
      } as CustomAdapter;
    },
  });
