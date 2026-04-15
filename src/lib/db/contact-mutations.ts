import type { ContactType } from "@/lib/supabase/types";
import { getDbPool } from "@/lib/db/pool";

export interface ContactMutationInput {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  bio: string | null;
  type: ContactType;
  companyIds: string[];
  projectIds: string[];
}

function normalizeIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export async function createContactWithRelations(input: ContactMutationInput) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const contactId = crypto.randomUUID();
    const { rows } = await client.query(
      `
        INSERT INTO contacts (id, name, email, phone, role, bio, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        contactId,
        input.name,
        input.email,
        input.phone,
        input.role,
        input.bio,
        input.type,
      ],
    );

    const companyIds = normalizeIds(input.companyIds);
    const projectIds = normalizeIds(input.projectIds);

    if (companyIds.length > 0) {
      await client.query(
        `
          INSERT INTO contact_companies (contact_id, company_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
        `,
        [contactId, companyIds],
      );
    }

    if (projectIds.length > 0) {
      await client.query(
        `
          INSERT INTO contact_projects (contact_id, project_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
        `,
        [contactId, projectIds],
      );
    }

    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateContactWithRelations(contactId: string, input: ContactMutationInput) {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const updateResult = await client.query(
      `
        UPDATE contacts
        SET name = $2,
            email = $3,
            phone = $4,
            role = $5,
            bio = $6,
            type = $7
        WHERE id = $1
        RETURNING *
      `,
      [
        contactId,
        input.name,
        input.email,
        input.phone,
        input.role,
        input.bio,
        input.type,
      ],
    );

    if (updateResult.rowCount === 0) {
      throw new Error("Contact not found.");
    }

    await client.query("DELETE FROM contact_companies WHERE contact_id = $1", [contactId]);
    await client.query("DELETE FROM contact_projects WHERE contact_id = $1", [contactId]);

    const companyIds = normalizeIds(input.companyIds);
    const projectIds = normalizeIds(input.projectIds);

    if (companyIds.length > 0) {
      await client.query(
        `
          INSERT INTO contact_companies (contact_id, company_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
        `,
        [contactId, companyIds],
      );
    }

    if (projectIds.length > 0) {
      await client.query(
        `
          INSERT INTO contact_projects (contact_id, project_id)
          SELECT $1::uuid, UNNEST($2::uuid[])
        `,
        [contactId, projectIds],
      );
    }

    await client.query("COMMIT");
    return updateResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
