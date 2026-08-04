import { S3Client } from "bun";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

export interface PutOptions {
  contentType?: string;
}

export interface BlobStore {
  get(key: string): Promise<Blob | null>;
  put(key: string, value: Blob | string | Uint8Array, options?: PutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  health(): Promise<void>;
}

export class MemoryBlobStore implements BlobStore {
  private readonly values = new Map<string, Blob>();

  async get(key: string): Promise<Blob | null> {
    return this.values.get(key) ?? null;
  }

  async put(
    key: string,
    value: Blob | string | Uint8Array,
    options: PutOptions = {},
  ): Promise<void> {
    const blobOptions = options.contentType ? { type: options.contentType } : {};
    let blob: Blob;
    if (value instanceof Blob) blob = value;
    else if (typeof value === "string") blob = new Blob([value], blobOptions);
    else blob = new Blob([Uint8Array.from(value)], blobOptions);
    this.values.set(key, blob);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
  }

  async health(): Promise<void> {}
}

export class FileSystemBlobStore implements BlobStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string): string {
    const resolved = path.resolve(this.root, key);
    if (resolved !== this.root && !resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return resolved;
  }

  async get(key: string): Promise<Blob | null> {
    const file = Bun.file(this.resolve(key));
    return (await file.exists()) ? file : null;
  }

  async put(
    key: string,
    value: Blob | string | Uint8Array,
    _options: PutOptions = {},
  ): Promise<void> {
    const destination = this.resolve(key);
    await mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.tmp-${crypto.randomUUID()}`;
    try {
      await Bun.write(temporary, value);
      await rename(temporary, destination);
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async list(prefix: string): Promise<string[]> {
    const prefixPath = this.resolve(prefix);
    const keys: string[] = [];

    const walk = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return [];
        throw error;
      });
      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(entryPath);
        else if (!entry.name.includes(".tmp-")) keys.push(path.relative(this.root, entryPath).split(path.sep).join("/"));
      }
    };

    await walk(prefixPath);
    return keys.filter((key) => key.startsWith(prefix)).sort();
  }

  async health(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const key = `.health-${crypto.randomUUID()}`;
    await this.put(key, "ok");
    await this.delete(key);
  }
}

export interface S3BlobStoreOptions {
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  region?: string;
}

export class S3BlobStore implements BlobStore {
  private readonly client: S3Client;

  constructor(options: S3BlobStoreOptions) {
    this.client = new S3Client({
      bucket: options.bucket,
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      ...(options.region ? { region: options.region } : {}),
    });
  }

  async get(key: string): Promise<Blob | null> {
    const exists = await this.client.exists(key);
    return exists ? this.client.file(key) : null;
  }

  async put(
    key: string,
    value: Blob | string | Uint8Array,
    options: PutOptions = {},
  ): Promise<void> {
    await this.client.write(key, value, options.contentType ? { type: options.contentType } : {});
  }

  async delete(key: string): Promise<void> {
    if (await this.client.exists(key)) await this.client.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const result = await this.client.list({
        prefix,
        maxKeys: 1_000,
        ...(continuationToken ? { continuationToken } : {}),
      });
      keys.push(...(result.contents ?? []).map(({ key }) => key));
      continuationToken = result.isTruncated ? result.nextContinuationToken : undefined;
    } while (continuationToken);

    return keys.sort();
  }

  async health(): Promise<void> {
    await this.client.list({ prefix: "zo-moments/health/", maxKeys: 1 });
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  return value;
}

export function createBlobStore(): BlobStore {
  const driver = process.env.STORAGE_DRIVER ?? (process.env.NODE_ENV === "production" ? "filesystem" : "memory");
  if (driver === "memory") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("The memory storage driver is disabled in production");
    }
    return new MemoryBlobStore();
  }
  if (driver === "filesystem") {
    return new FileSystemBlobStore(
      process.env.STORAGE_ROOT ?? "/home/workspace/Start/garden-of-zo/zo-memories-data",
    );
  }
  if (driver !== "s3") throw new Error(`Unsupported storage driver: ${driver}`);

  return new S3BlobStore({
    bucket: required("S3_BUCKET"),
    accessKeyId: required("S3_ACCESS_KEY_ID"),
    secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    ...(process.env.S3_REGION ? { region: process.env.S3_REGION } : {}),
  });
}
