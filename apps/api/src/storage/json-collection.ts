import type { BlobStore } from "./blob-store";

export class JsonCollection<T extends { id: string }> {
  constructor(
    private readonly store: BlobStore,
    private readonly name: string,
  ) {}

  private key(id: string): string {
    return `zo-moments/records/${this.name}/${encodeURIComponent(id)}.json`;
  }

  async get(id: string): Promise<T | null> {
    const blob = await this.store.get(this.key(id));
    return blob ? ((await blob.json()) as T) : null;
  }

  async put(value: T): Promise<T> {
    await this.store.put(this.key(value.id), JSON.stringify(value), {
      contentType: "application/json",
    });
    return value;
  }

  async delete(id: string): Promise<void> {
    await this.store.delete(this.key(id));
  }

  async list(): Promise<T[]> {
    const prefix = `zo-moments/records/${this.name}/`;
    const keys = await this.store.list(prefix);
    const values: T[] = [];
    for (const key of keys) {
      const blob = await this.store.get(key);
      if (blob) values.push((await blob.json()) as T);
    }
    return values;
  }

  async find(predicate: (value: T) => boolean): Promise<T[]> {
    return (await this.list()).filter(predicate);
  }

  async findOne(predicate: (value: T) => boolean): Promise<T | null> {
    return (await this.list()).find(predicate) ?? null;
  }

  async deleteWhere(predicate: (value: T) => boolean): Promise<number> {
    const values = await this.find(predicate);
    await Promise.all(values.map(({ id }) => this.delete(id)));
    return values.length;
  }
}
