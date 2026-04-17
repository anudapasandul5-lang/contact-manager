import { getDbPool } from "@/lib/db/pool";
import { buildInferredRelationships } from "@/lib/intro/graph";
import type {
  Company,
  ContactWithRelations,
  FollowUp,
  IntroRequest,
  NetworkData,
  PersonRelationship,
  Project,
  Vendor,
  VendorPerson,
  VendorWithRelations,
} from "@/lib/supabase/types";

type ContactRow = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  type: ContactWithRelations["type"];
  notes: string | null;
  bio: string | null;
  created_at: Date | string;
};

type CompanyRow = Company & { created_at: Date | string };
type ProjectRow = Project & { created_at: Date | string };
type VendorRow = Vendor & { created_at: Date | string };
type VendorPersonRow = VendorPerson & { created_at: Date | string };

function asIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toISOString();
}

function hydrateRelationship(row: Record<string, unknown>): PersonRelationship {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    source_contact_id: String(row.source_contact_id),
    target_contact_id: String(row.target_contact_id),
    strength: row.strength as PersonRelationship["strength"],
    is_inferred: Boolean(row.is_inferred),
    evidence_type: row.evidence_type as PersonRelationship["evidence_type"],
    evidence_company_id: (row.evidence_company_id as string | null) ?? null,
    evidence_project_id: (row.evidence_project_id as string | null) ?? null,
    last_confirmed_at: asIso(row.last_confirmed_at as Date | string | null),
    how_they_know_each_other: (row.how_they_know_each_other as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: asIso(row.created_at as Date | string)!,
    updated_at: asIso(row.updated_at as Date | string)!,
  };
}

export async function fetchNetworkData(userId: string): Promise<NetworkData> {
  const pool = getDbPool();
  const client = await pool.connect();

  try {
    const [
      contactsResult,
      companiesResult,
      projectsResult,
      vendorsResult,
      relationshipsResult,
      introRequestsResult,
      followUpsResult,
    ] = await Promise.all([
      client.query("SELECT * FROM contacts WHERE user_id = $1 ORDER BY name", [userId]),
      client.query("SELECT * FROM companies WHERE user_id = $1 ORDER BY name", [userId]),
      client.query("SELECT * FROM projects WHERE user_id = $1 ORDER BY name", [userId]),
      client.query("SELECT * FROM vendors WHERE user_id = $1 ORDER BY name", [userId]),
      client.query("SELECT * FROM person_relationships WHERE user_id = $1 ORDER BY updated_at DESC", [userId]),
      client.query("SELECT * FROM intro_requests WHERE user_id = $1 ORDER BY updated_at DESC", [userId]),
      client.query("SELECT * FROM follow_ups WHERE user_id = $1 ORDER BY scheduled_for ASC, created_at ASC", [userId]),
    ]);

    const contactIds = (contactsResult.rows as ContactRow[]).map((contact) => contact.id);
    const companyIds = (companiesResult.rows as CompanyRow[]).map((company) => company.id);
    const projectIds = (projectsResult.rows as ProjectRow[]).map((project) => project.id);
    const vendorIds = (vendorsResult.rows as VendorRow[]).map((vendor) => vendor.id);

    const [
      vendorPeopleResult,
      contactCompaniesResult,
      contactProjectsResult,
      vendorCompaniesResult,
      vendorProjectsResult,
    ] = await Promise.all([
      client.query("SELECT * FROM vendor_people WHERE vendor_id = ANY($1::text[]) ORDER BY name", [vendorIds]),
      client.query("SELECT contact_id, company_id FROM contact_companies WHERE contact_id = ANY($1::text[])", [contactIds]),
      client.query("SELECT contact_id, project_id FROM contact_projects WHERE contact_id = ANY($1::text[])", [contactIds]),
      client.query("SELECT vendor_id, company_id FROM vendor_companies WHERE vendor_id = ANY($1::text[])", [vendorIds]),
      client.query("SELECT vendor_id, project_id FROM vendor_projects WHERE vendor_id = ANY($1::text[])", [vendorIds]),
    ]);

    const companies = (companiesResult.rows as CompanyRow[]).map((company) => ({
      ...company,
      created_at: asIso(company.created_at)!,
    }));
    const companiesById = new Map(companies.map((company) => [company.id, company]));

    const projects = (projectsResult.rows as ProjectRow[]).map((project) => ({
      ...project,
      created_at: asIso(project.created_at)!,
    }));
    const projectsById = new Map(projects.map((project) => [project.id, project]));

    const vendors = (vendorsResult.rows as VendorRow[]).map((vendor) => ({
      ...vendor,
      created_at: asIso(vendor.created_at)!,
    }));
    const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

    const vendorPeopleByVendorId = new Map<string, VendorPerson[]>();
    (vendorPeopleResult.rows as VendorPersonRow[]).forEach((person) => {
      const list = vendorPeopleByVendorId.get(person.vendor_id) ?? [];
      list.push({
        ...person,
        created_at: asIso(person.created_at)!,
      });
      vendorPeopleByVendorId.set(person.vendor_id, list);
    });

    const companyLinks = new Map<string, { companies: Company }[]>();
    (contactCompaniesResult.rows as { contact_id: string; company_id: string }[]).forEach(({ contact_id, company_id }) => {
      const company = companiesById.get(company_id);
      if (!company) return;

      const list = companyLinks.get(contact_id) ?? [];
      list.push({ companies: company });
      companyLinks.set(contact_id, list);
    });

    const projectLinks = new Map<string, { projects: Project }[]>();
    (contactProjectsResult.rows as { contact_id: string; project_id: string }[]).forEach(({ contact_id, project_id }) => {
      const project = projectsById.get(project_id);
      if (!project) return;

      const list = projectLinks.get(contact_id) ?? [];
      list.push({ projects: project });
      projectLinks.set(contact_id, list);
    });

    const vendorCompanyLinks = new Map<string, { companies: Company }[]>();
    (vendorCompaniesResult.rows as { vendor_id: string; company_id: string }[]).forEach(({ vendor_id, company_id }) => {
      const company = companiesById.get(company_id);
      if (!company) return;

      const list = vendorCompanyLinks.get(vendor_id) ?? [];
      list.push({ companies: company });
      vendorCompanyLinks.set(vendor_id, list);
    });

    const vendorProjectLinks = new Map<string, { projects: Project }[]>();
    (vendorProjectsResult.rows as { vendor_id: string; project_id: string }[]).forEach(({ vendor_id, project_id }) => {
      const project = projectsById.get(project_id);
      if (!project) return;

      const list = vendorProjectLinks.get(vendor_id) ?? [];
      list.push({ projects: project });
      vendorProjectLinks.set(vendor_id, list);
    });

    const contacts: ContactWithRelations[] = (contactsResult.rows as ContactRow[]).map((contact) => ({
      ...contact,
      created_at: asIso(contact.created_at)!,
      contact_companies: companyLinks.get(contact.id) ?? [],
      contact_projects: projectLinks.get(contact.id) ?? [],
    }));

    const explicitRelationships = (relationshipsResult.rows as Record<string, unknown>[]).map((row) => {
      const relationship = hydrateRelationship(row);
      return {
        ...relationship,
        evidence_company: relationship.evidence_company_id ? companiesById.get(relationship.evidence_company_id) ?? null : null,
        evidence_project: relationship.evidence_project_id ? projectsById.get(relationship.evidence_project_id) ?? null : null,
      };
    });

    const introRequests: IntroRequest[] = (introRequestsResult.rows as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      requester_contact_id: (row.requester_contact_id as string | null) ?? null,
      connector_contact_id: String(row.connector_contact_id),
      target_contact_id: String(row.target_contact_id),
      status: row.status as IntroRequest["status"],
      message_draft: (row.message_draft as string | null) ?? null,
      requested_at: asIso(row.requested_at as Date | string | null),
      resolved_at: asIso(row.resolved_at as Date | string | null),
      outcome_notes: (row.outcome_notes as string | null) ?? null,
      created_at: asIso(row.created_at as Date | string)!,
      updated_at: asIso(row.updated_at as Date | string)!,
    }));
    const followUps: FollowUp[] = (followUpsResult.rows as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      contact_id: String(row.contact_id),
      company_id: (row.company_id as string | null) ?? null,
      project_id: (row.project_id as string | null) ?? null,
      objective: String(row.objective),
      notes: (row.notes as string | null) ?? null,
      scheduled_for: asIso(row.scheduled_for as Date | string)!,
      completed_at: asIso(row.completed_at as Date | string | null),
      completion_note: (row.completion_note as string | null) ?? null,
      created_at: asIso(row.created_at as Date | string)!,
      updated_at: asIso(row.updated_at as Date | string)!,
    }));

    return {
      contacts,
      companies,
      vendors: vendors
        .filter((vendor) => vendorsById.has(vendor.id))
        .map((vendor) => ({
          ...vendor,
          vendor_people: vendorPeopleByVendorId.get(vendor.id) ?? [],
          vendor_companies: vendorCompanyLinks.get(vendor.id) ?? [],
          vendor_projects: vendorProjectLinks.get(vendor.id) ?? [],
        })) satisfies VendorWithRelations[],
      projects,
      relationships: [...explicitRelationships, ...buildInferredRelationships(contacts, explicitRelationships)],
      introRequests,
      followUps,
    };
  } finally {
    client.release();
  }
}
