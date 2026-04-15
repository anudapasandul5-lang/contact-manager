import type { MediaEntityType } from "@/lib/media/media";

type MediaResponse = {
  storagePath: string;
  signedUrl: string | null;
};

async function parseResponseError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error || fallback;
}

export async function uploadEntityMediaClient(
  entityType: MediaEntityType,
  entityId: string,
  file: File,
) {
  const formData = new FormData();
  formData.set("entityType", entityType);
  formData.set("entityId", entityId);
  formData.set("file", file);

  const response = await fetch("/api/media", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response, "Failed to upload image."));
  }

  return response.json() as Promise<MediaResponse>;
}

export async function deleteEntityMediaClient(entityType: MediaEntityType, entityId: string) {
  const response = await fetch("/api/media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, entityId }),
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response, "Failed to remove image."));
  }
}
