import type {
  ContactType,
  FollowUp,
  IntroRequestStatus,
  ProjectStatus,
  RelationshipEvidenceType,
  RelationshipStrength,
} from "@/lib/supabase/types";

const EDITABLE_CONTACT_TYPES: ContactType[] = ["employee", "vendor", "investor", "cofounder", "partner"];
const PROJECT_STATUSES: ProjectStatus[] = ["planning", "active", "completed"];
const RELATIONSHIP_STRENGTHS: RelationshipStrength[] = ["weak", "warm", "strong"];
const RELATIONSHIP_EVIDENCE_TYPES: RelationshipEvidenceType[] = ["manual", "shared_company", "shared_project"];
const INTRO_REQUEST_STATUSES: IntroRequestStatus[] = ["draft", "requested", "accepted", "declined", "completed"];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown) {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalDateString(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    throw new Error("A valid date is required.");
  }

  return new Date(parsed).toISOString();
}

function normalizeRequiredDateString(value: unknown, message: string) {
  const normalized = normalizeOptionalDateString(value);
  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

function normalizeIdArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeEditableContactType(value: unknown): ContactType | null {
  const normalized = normalizeString(value);

  if (normalized === "service_provider") {
    return "vendor";
  }

  return EDITABLE_CONTACT_TYPES.includes(normalized as ContactType)
    ? (normalized as ContactType)
    : null;
}

export function parseContactPayload(body: unknown) {
  const name = normalizeString((body as { name?: unknown })?.name);
  const type = normalizeEditableContactType((body as { type?: unknown })?.type);

  if (!name) {
    throw new Error("Name is required.");
  }

  if (!type) {
    throw new Error("A valid contact type is required.");
  }

  return {
    name,
    email: normalizeOptionalString((body as { email?: unknown })?.email),
    phone: normalizeOptionalString((body as { phone?: unknown })?.phone),
    role: normalizeOptionalString((body as { role?: unknown })?.role),
    bio: normalizeOptionalString((body as { bio?: unknown })?.bio),
    notes: normalizeOptionalString((body as { notes?: unknown })?.notes),
    type,
    companyIds: normalizeIdArray((body as { companyIds?: unknown })?.companyIds),
    projectIds: normalizeIdArray((body as { projectIds?: unknown })?.projectIds),
  };
}

export function parseVendorPayload(body: unknown) {
  const name = normalizeString((body as { name?: unknown })?.name);

  if (!name) {
    throw new Error("Vendor name is required.");
  }

  const people = Array.isArray((body as { people?: unknown[] })?.people)
    ? (body as { people?: unknown[] }).people!.map((person) => {
        const normalizedName = normalizeString((person as { name?: unknown })?.name);

        if (!normalizedName) {
          throw new Error("Each vendor person requires a name.");
        }

        return {
          id: normalizeOptionalString((person as { id?: unknown })?.id),
          name: normalizedName,
          email: normalizeOptionalString((person as { email?: unknown })?.email),
          phone: normalizeOptionalString((person as { phone?: unknown })?.phone),
          role: normalizeOptionalString((person as { role?: unknown })?.role),
          bio: normalizeOptionalString((person as { bio?: unknown })?.bio),
        };
      })
    : [];

  return {
    name,
    specialty: normalizeOptionalString((body as { specialty?: unknown })?.specialty),
    notes: normalizeOptionalString((body as { notes?: unknown })?.notes),
    color: normalizeOptionalString((body as { color?: unknown })?.color),
    companyIds: normalizeIdArray((body as { companyIds?: unknown })?.companyIds),
    projectIds: normalizeIdArray((body as { projectIds?: unknown })?.projectIds),
    people,
  };
}

export function parseCompanyPayload(body: unknown) {
  const name = normalizeString((body as { name?: unknown })?.name);
  const industry = normalizeString((body as { industry?: unknown })?.industry);

  if (!name || !industry) {
    throw new Error("Name and industry are required.");
  }

  return {
    name,
    industry,
    color: normalizeOptionalString((body as { color?: unknown })?.color),
    is_owned: Boolean((body as { is_owned?: unknown })?.is_owned),
  };
}

export function parseProjectPayload(body: unknown) {
  const name = normalizeString((body as { name?: unknown })?.name);
  const status = normalizeString((body as { status?: unknown })?.status) as ProjectStatus;

  if (!name) {
    throw new Error("Name is required.");
  }

  return {
    name,
    status: PROJECT_STATUSES.includes(status) ? status : "planning",
    company_id: normalizeOptionalString((body as { company_id?: unknown })?.company_id),
  };
}

export function parseRelationshipPayload(body: unknown) {
  const sourceContactId = normalizeString((body as { source_contact_id?: unknown })?.source_contact_id);
  const targetContactId = normalizeString((body as { target_contact_id?: unknown })?.target_contact_id);
  const strength = normalizeString((body as { strength?: unknown })?.strength) as RelationshipStrength;
  const evidenceType = normalizeString((body as { evidence_type?: unknown })?.evidence_type) as RelationshipEvidenceType;

  if (!sourceContactId || !targetContactId) {
    throw new Error("Both contacts are required.");
  }

  if (sourceContactId === targetContactId) {
    throw new Error("A relationship must connect two different contacts.");
  }

  if (!RELATIONSHIP_STRENGTHS.includes(strength)) {
    throw new Error("A valid relationship strength is required.");
  }

  return {
    source_contact_id: sourceContactId,
    target_contact_id: targetContactId,
    strength: RELATIONSHIP_STRENGTHS.includes(strength) ? strength : "warm",
    evidence_type: RELATIONSHIP_EVIDENCE_TYPES.includes(evidenceType) ? evidenceType : "manual",
    evidence_company_id: normalizeOptionalString((body as { evidence_company_id?: unknown })?.evidence_company_id),
    evidence_project_id: normalizeOptionalString((body as { evidence_project_id?: unknown })?.evidence_project_id),
    last_confirmed_at: normalizeOptionalDateString((body as { last_confirmed_at?: unknown })?.last_confirmed_at),
    how_they_know_each_other: normalizeOptionalString((body as { how_they_know_each_other?: unknown })?.how_they_know_each_other),
    notes: normalizeOptionalString((body as { notes?: unknown })?.notes),
  };
}

export function parseIntroRequestPayload(body: unknown) {
  const connectorContactId = normalizeString((body as { connector_contact_id?: unknown })?.connector_contact_id);
  const targetContactId = normalizeString((body as { target_contact_id?: unknown })?.target_contact_id);
  const status = normalizeString((body as { status?: unknown })?.status) as IntroRequestStatus;

  if (!connectorContactId || !targetContactId) {
    throw new Error("Connector and target contacts are required.");
  }

  return {
    requester_contact_id: normalizeOptionalString((body as { requester_contact_id?: unknown })?.requester_contact_id),
    connector_contact_id: connectorContactId,
    target_contact_id: targetContactId,
    status: INTRO_REQUEST_STATUSES.includes(status) ? status : "draft",
    message_draft: normalizeOptionalString((body as { message_draft?: unknown })?.message_draft),
    requested_at: normalizeOptionalDateString((body as { requested_at?: unknown })?.requested_at),
    resolved_at: normalizeOptionalDateString((body as { resolved_at?: unknown })?.resolved_at),
    outcome_notes: normalizeOptionalString((body as { outcome_notes?: unknown })?.outcome_notes),
  };
}

type FollowUpEditablePayload = Pick<
  FollowUp,
  "company_id" | "project_id" | "objective" | "notes" | "scheduled_for"
>;

export function parseFollowUpCreatePayload(body: unknown) {
  const contactId = normalizeString((body as { contact_id?: unknown })?.contact_id);
  const objective = normalizeString((body as { objective?: unknown })?.objective);

  if (!contactId || !objective || !normalizeOptionalString((body as { scheduled_for?: unknown })?.scheduled_for)) {
    throw new Error("Contact, objective and scheduled follow-up date are required.");
  }

  return {
    contact_id: contactId,
    company_id: normalizeOptionalString((body as { company_id?: unknown })?.company_id),
    project_id: normalizeOptionalString((body as { project_id?: unknown })?.project_id),
    objective,
    notes: normalizeOptionalString((body as { notes?: unknown })?.notes),
    scheduled_for: normalizeRequiredDateString(
      (body as { scheduled_for?: unknown })?.scheduled_for,
      "Contact, objective and scheduled follow-up date are required.",
    ),
  };
}

export function parseFollowUpPatchPayload(body: unknown): FollowUpEditablePayload {
  const objective = normalizeString((body as { objective?: unknown })?.objective);

  if (!objective || !normalizeOptionalString((body as { scheduled_for?: unknown })?.scheduled_for)) {
    throw new Error("Objective and scheduled follow-up date are required.");
  }

  return {
    company_id: normalizeOptionalString((body as { company_id?: unknown })?.company_id),
    project_id: normalizeOptionalString((body as { project_id?: unknown })?.project_id),
    objective,
    notes: normalizeOptionalString((body as { notes?: unknown })?.notes),
    scheduled_for: normalizeRequiredDateString(
      (body as { scheduled_for?: unknown })?.scheduled_for,
      "Objective and scheduled follow-up date are required.",
    ),
  };
}

export function parseFollowUpCompletionPayload(body: unknown) {
  const nextBody = (body as { next?: unknown })?.next;

  return {
    completion_note: normalizeOptionalString((body as { completion_note?: unknown })?.completion_note),
    next: nextBody == null ? null : parseFollowUpCreatePayload(nextBody),
  };
}
