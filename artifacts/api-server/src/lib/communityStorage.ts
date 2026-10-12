import { Storage } from "@google-cloud/storage";

const sidecar = "http://127.0.0.1:1106";
const client = new Storage({
  credentials: {
    audience: "replit", subject_token_type: "access_token", token_url: `${sidecar}/token`,
    type: "external_account",
    credential_source: { url: `${sidecar}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export function photoPath(id: string) {
  const directory = process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/, "");
  if (!directory) throw new Error("Photo storage is not configured.");
  return `${directory}/community/${id}`;
}

function splitPath(path: string) {
  const [bucket, ...parts] = path.replace(/^\/+/, "").split("/");
  if (!bucket || !parts.length) throw new Error("Invalid storage path.");
  return { bucket, object: parts.join("/") };
}

export async function signedPhotoUrl(path: string, method: "GET" | "PUT" | "DELETE") {
  const { bucket, object } = splitPath(path);
  const response = await fetch(`${sidecar}/object-storage/signed-object-url`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket_name: bucket, object_name: object, method, expires_at: new Date(Date.now() + 900_000).toISOString() }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Unable to prepare photo access.");
  const data = await response.json();
  if (!data || typeof data !== "object" || !("signed_url" in data) || typeof data.signed_url !== "string") {
    throw new Error("Invalid photo access response.");
  }
  return data.signed_url;
}

export async function validateUploadedPhoto(path: string, type: string, size: number) {
  const { bucket, object } = splitPath(path);
  const [metadata] = await client.bucket(bucket).file(object).getMetadata();
  return Number(metadata.size) === size && size <= 8_388_608 && metadata.contentType === type;
}
