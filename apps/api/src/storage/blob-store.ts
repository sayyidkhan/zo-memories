import { S3Client } from "bun";

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
  const driver = process.env.STORAGE_DRIVER ?? "s3";
  if (driver === "memory") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("The memory storage driver is disabled in production");
    }
    return new MemoryBlobStore();
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
