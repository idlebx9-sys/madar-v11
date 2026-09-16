/**
 * S3-compatible storage (AWS S3 / Cloudflare R2 / MinIO).
 * All uploads go through presigned PUT URLs — never base64 through the API.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";
import { ENV } from "./_core/env";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  if (!ENV.s3Bucket || !ENV.s3AccessKey || !ENV.s3SecretKey) {
    throw new Error(
      "S3 storage not configured. Set S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY (and optionally S3_ENDPOINT, S3_REGION, S3_PUBLIC_BASE_URL).",
    );
  }
  _client = new S3Client({
    region: ENV.s3Region || "auto",
    endpoint: ENV.s3Endpoint || undefined,
    forcePathStyle: Boolean(ENV.s3Endpoint),
    credentials: {
      accessKeyId: ENV.s3AccessKey,
      secretAccessKey: ENV.s3SecretKey,
    },
  });
  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\.\./g, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function publicUrlForKey(key: string): string {
  if (ENV.s3PublicBaseUrl) {
    return `${ENV.s3PublicBaseUrl.replace(/\/+$/, "")}/${key}`;
  }
  return `/madar-storage/${key}`;
}

/** Generate a presigned PUT URL for direct browser → S3 upload. */
export async function createPresignedUpload(opts: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
  const client = getClient();
  const key = appendHashSuffix(normalizeKey(opts.key));
  const command = new PutObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
    ContentType: opts.contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: opts.expiresIn ?? 600,
  });
  return {
    key,
    uploadUrl,
    publicUrl: publicUrlForKey(key),
  };
}

/** Server-side upload (prefer presigned for large files). */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const client = getClient();
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = typeof data === "string" ? Buffer.from(data) : data;
  await client.send(
    new PutObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return { key, url: publicUrlForKey(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: publicUrlForKey(key) };
}

export async function storageGetSignedUrl(relKey: string, expiresIn = 3600): Promise<string> {
  const client = getClient();
  const key = normalizeKey(relKey);
  const command = new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

export async function storageDelete(relKey: string): Promise<void> {
  const client = getClient();
  const key = normalizeKey(relKey);
  await client.send(
    new DeleteObjectCommand({
      Bucket: ENV.s3Bucket,
      Key: key,
    }),
  );
}

export async function storageExists(relKey: string): Promise<boolean> {
  try {
    const client = getClient();
    await client.send(
      new HeadObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: normalizeKey(relKey),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function isStorageConfigured(): boolean {
  return Boolean(ENV.s3Bucket && ENV.s3AccessKey && ENV.s3SecretKey);
}
