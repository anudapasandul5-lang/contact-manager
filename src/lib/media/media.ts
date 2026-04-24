export const MEDIA_BUCKET = "network-media";
export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type MediaEntityType = "contact" | "company" | "project";

type EntityConfig = {
  table: "contacts" | "companies" | "projects";
  pathField: "photo_path" | "logo_path";
  urlField: "photo_url" | "logo_url";
  directory: "contacts" | "companies" | "projects";
  fileStem: "profile" | "logo";
};

const ENTITY_CONFIG: Record<MediaEntityType, EntityConfig> = {
  contact: {
    table: "contacts",
    pathField: "photo_path",
    urlField: "photo_url",
    directory: "contacts",
    fileStem: "profile",
  },
  company: {
    table: "companies",
    pathField: "logo_path",
    urlField: "logo_url",
    directory: "companies",
    fileStem: "logo",
  },
  project: {
    table: "projects",
    pathField: "logo_path",
    urlField: "logo_url",
    directory: "projects",
    fileStem: "logo",
  },
};

type QueryResult<T> = Promise<{ data: T; error: { message: string } | null }>;
type MutationResult = Promise<{ error: { message: string } | null }>;

type SupabaseQueryBuilder = {
  select: (columns?: string) => SupabaseQueryBuilder;
  eq: (column: string, value: string) => SupabaseQueryBuilder;
  maybeSingle: () => QueryResult<Record<string, unknown> | null>;
  update: (values: Record<string, unknown>) => SupabaseQueryBuilder;
};

type SupabaseStorageBucket = {
  upload: (path: string, body: Buffer, options: { contentType: string; upsert: boolean }) => QueryResult<unknown>;
  remove: (paths: string[]) => QueryResult<unknown>;
  createSignedUrl: (path: string, expiresIn: number) => QueryResult<{ signedUrl: string } | null>;
};

type SupabaseLike = {
  from: (table: string) => SupabaseQueryBuilder;
  storage: {
    from: (bucket: string) => SupabaseStorageBucket;
  };
};

function asMutationResult(value: unknown) {
  return value as MutationResult;
}

function getEntityConfig(entityType: MediaEntityType) {
  return ENTITY_CONFIG[entityType];
}

export function isMediaEntityType(value: string): value is MediaEntityType {
  return value === "contact" || value === "company" || value === "project";
}

function getExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Only jpeg, png, or webp images are allowed.");
  }
}

function getStoredPath(value: unknown) {
  return typeof value === "string" ? value : null;
}

async function findOwnedEntity(
  supabase: SupabaseLike,
  userId: string,
  entityType: MediaEntityType,
  entityId: string,
) {
  const config = getEntityConfig(entityType);
  const { data, error } = await supabase
    .from(config.table)
    .select(`id, user_id, ${config.pathField}`)
    .eq("id", entityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Entity not found.");
  }

  return data;
}

export function validateMediaUpload(file: File) {
  if (!(file instanceof File)) {
    throw new Error("A file is required.");
  }

  if (!ALLOWED_MEDIA_TYPES.includes(file.type as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    throw new Error("Only jpeg, png, or webp images are allowed.");
  }

  if (file.size > MAX_MEDIA_FILE_SIZE) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  return {
    mimeType: file.type,
    extension: getExtensionForMimeType(file.type),
  };
}

export function buildMediaStoragePath(
  userId: string,
  entityType: MediaEntityType,
  entityId: string,
  extension: string,
) {
  const config = getEntityConfig(entityType);
  return `${userId}/${config.directory}/${entityId}/${config.fileStem}.${extension}`;
}

export async function createSignedMediaUrl(
  supabase: SupabaseLike,
  path: string | null | undefined,
  expiresIn = 60 * 10,
) {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function resolveAvatarUrl(
  supabase: SupabaseLike,
  avatarPath: string | null | undefined,
) {
  return createSignedMediaUrl(supabase, avatarPath, 60 * 60 * 24 * 7);
}

export async function attachSignedMediaUrls<T extends object>(
  supabase: SupabaseLike,
  entityType: MediaEntityType,
  items: T[],
) {
  const config = getEntityConfig(entityType);

  return Promise.all(
    items.map(async (item) => {
      const pathValue = (item as Record<string, unknown>)[config.pathField];
      const signedUrl = await createSignedMediaUrl(supabase, typeof pathValue === "string" ? pathValue : null);

      return {
        ...item,
        [config.urlField]: signedUrl,
      };
    }),
  );
}

export function mapEntitiesById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

export function applyRelatedMediaToContacts<
  T extends {
    contact_companies?: Array<{ companies: { id: string } }>;
    contact_projects?: Array<{ projects: { id: string } }>;
  },
  TCompany extends { id: string },
  TProject extends { id: string },
>(
  contacts: T[],
  companiesById: Map<string, TCompany>,
  projectsById: Map<string, TProject>,
) {
  return contacts.map((contact) => ({
    ...contact,
    contact_companies: (contact.contact_companies ?? []).map((entry) => ({
      ...entry,
      companies: companiesById.get(entry.companies.id) ?? entry.companies,
    })),
    contact_projects: (contact.contact_projects ?? []).map((entry) => ({
      ...entry,
      projects: projectsById.get(entry.projects.id) ?? entry.projects,
    })),
  }));
}

export async function uploadEntityMedia(
  supabase: SupabaseLike,
  userId: string,
  entityType: MediaEntityType,
  entityId: string,
  file: File,
) {
  const config = getEntityConfig(entityType);
  const entity = await findOwnedEntity(supabase, userId, entityType, entityId);
  const { mimeType, extension } = validateMediaUpload(file);
  const storagePath = buildMediaStoragePath(userId, entityType, entityId, extension);
  const previousPath = getStoredPath(entity[config.pathField]);
  const body = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, body, {
    contentType: mimeType,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await asMutationResult(
    supabase
      .from(config.table)
      .update({ [config.pathField]: storagePath })
      .eq("id", entityId)
      .eq("user_id", userId),
  );

  if (updateError) {
    await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
    throw new Error(updateError.message);
  }

  if (previousPath && previousPath !== storagePath) {
    const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove([previousPath]);
    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  return {
    storagePath,
    signedUrl: await createSignedMediaUrl(supabase, storagePath),
  };
}

export async function deleteEntityMedia(
  supabase: SupabaseLike,
  userId: string,
  entityType: MediaEntityType,
  entityId: string,
) {
  const config = getEntityConfig(entityType);
  const entity = await findOwnedEntity(supabase, userId, entityType, entityId);
  const currentPath = getStoredPath(entity[config.pathField]);

  if (currentPath) {
    const { error: removeError } = await supabase.storage.from(MEDIA_BUCKET).remove([currentPath]);
    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  const { error: updateError } = await asMutationResult(
    supabase
      .from(config.table)
      .update({ [config.pathField]: null })
      .eq("id", entityId)
      .eq("user_id", userId),
  );

  if (updateError) {
    throw new Error(updateError.message);
  }
}
