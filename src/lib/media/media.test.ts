import assert from "node:assert/strict";
import test from "node:test";
import {
  attachSignedMediaUrls,
  buildMediaStoragePath,
  deleteEntityMedia,
  MEDIA_BUCKET,
  uploadEntityMedia,
  validateMediaUpload,
} from "@/lib/media/media";

function createImageFile(
  contents: string,
  name: string,
  type: string,
) {
  return new File([contents], name, { type });
}

test("validateMediaUpload accepts supported image types within the size limit", () => {
  const file = createImageFile("hello", "avatar.png", "image/png");

  const result = validateMediaUpload(file);

  assert.equal(result.extension, "png");
  assert.equal(result.mimeType, "image/png");
});

test("validateMediaUpload rejects unsupported file types", () => {
  const file = createImageFile("hello", "avatar.gif", "image/gif");

  assert.throws(() => validateMediaUpload(file), /jpeg, png, or webp/i);
});

test("buildMediaStoragePath creates user-scoped paths for each entity type", () => {
  assert.equal(
    buildMediaStoragePath("user-1", "contact", "contact-1", "png"),
    "user-1/contacts/contact-1/profile.png",
  );
  assert.equal(
    buildMediaStoragePath("user-1", "company", "company-1", "webp"),
    "user-1/companies/company-1/logo.webp",
  );
  assert.equal(
    buildMediaStoragePath("user-1", "project", "project-1", "jpg"),
    "user-1/projects/project-1/logo.jpg",
  );
});

test("uploadEntityMedia uploads the file, updates the entity path column, and returns a signed url", async () => {
  let uploadedPath = "";
  let uploadedContentType = "";
  let updatedColumn = "";
  let updatedValue = "";
  let removedPaths: string[] = [];

  const supabase = {
    from(table: string) {
      assert.equal(table, "contacts");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({
          data: { id: "contact-1", user_id: "user-1", photo_path: "user-1/contacts/contact-1/profile.png" },
          error: null,
        }),
        update(values: Record<string, unknown>) {
          updatedColumn = Object.keys(values)[0] ?? "";
          updatedValue = String(values[updatedColumn]);
          return {
            eq() {
              return this;
            },
            select() {
              return {
                maybeSingle: async () => ({ data: { id: "contact-1", ...values }, error: null }),
              };
            },
          };
        },
      };
    },
    storage: {
      from(bucket: string) {
        assert.equal(bucket, MEDIA_BUCKET);
        return {
          upload: async (path: string, _body: Buffer, options: { contentType?: string }) => {
            uploadedPath = path;
            uploadedContentType = options.contentType ?? "";
            return { data: null, error: null };
          },
          remove: async (paths: string[]) => {
            removedPaths = [...removedPaths, ...paths];
            return { data: null, error: null };
          },
          createSignedUrl: async (path: string) => ({
            data: { signedUrl: `https://signed.example/${path}` },
            error: null,
          }),
        };
      },
    },
  };

  const file = createImageFile("hello", "avatar.webp", "image/webp");
  const result = await uploadEntityMedia(supabase as never, "user-1", "contact", "contact-1", file);

  assert.equal(uploadedPath, "user-1/contacts/contact-1/profile.webp");
  assert.equal(uploadedContentType, "image/webp");
  assert.equal(updatedColumn, "photo_path");
  assert.equal(updatedValue, "user-1/contacts/contact-1/profile.webp");
  assert.deepEqual(removedPaths, ["user-1/contacts/contact-1/profile.png"]);
  assert.equal(result.storagePath, "user-1/contacts/contact-1/profile.webp");
  assert.equal(result.signedUrl, "https://signed.example/user-1/contacts/contact-1/profile.webp");
});

test("deleteEntityMedia removes the storage object and clears the stored path", async () => {
  let clearedColumn = "";
  let removedPaths: string[] = [];

  const supabase = {
    from(table: string) {
      assert.equal(table, "projects");
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({
          data: { id: "project-1", user_id: "user-1", logo_path: "user-1/projects/project-1/logo.png" },
          error: null,
        }),
        update(values: Record<string, unknown>) {
          clearedColumn = Object.keys(values)[0] ?? "";
          return {
            eq() {
              return this;
            },
          };
        },
      };
    },
    storage: {
      from(bucket: string) {
        assert.equal(bucket, MEDIA_BUCKET);
        return {
          remove: async (paths: string[]) => {
            removedPaths = [...paths];
            return { data: null, error: null };
          },
        };
      },
    },
  };

  await deleteEntityMedia(supabase as never, "user-1", "project", "project-1");

  assert.equal(clearedColumn, "logo_path");
  assert.deepEqual(removedPaths, ["user-1/projects/project-1/logo.png"]);
});

test("attachSignedMediaUrls leaves entities without media paths untouched and signs the rest", async () => {
  const supabase = {
    storage: {
      from(bucket: string) {
        assert.equal(bucket, MEDIA_BUCKET);
        return {
          createSignedUrl: async (path: string) => ({
            data: { signedUrl: `https://signed.example/${path}` },
            error: null,
          }),
        };
      },
    },
  };

  const result = await attachSignedMediaUrls(
    supabase as never,
    "company",
    [
      { id: "company-1", name: "Alpha", logo_path: "user-1/companies/company-1/logo.png" },
      { id: "company-2", name: "Beta", logo_path: null },
    ],
  );

  assert.equal(result[0]?.logo_url, "https://signed.example/user-1/companies/company-1/logo.png");
  assert.equal(result[1]?.logo_url, null);
});
