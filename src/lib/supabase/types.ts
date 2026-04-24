export type ContactType = "employee" | "vendor";
export type ProjectStatus = "planning" | "active" | "completed";
export type RelationshipStrength = "weak" | "warm" | "strong";
export type RelationshipEvidenceType = "manual" | "shared_company" | "shared_project";
export type IntroRequestStatus = "draft" | "requested" | "accepted" | "declined" | "completed";
export type IntroConfidence = "high" | "medium" | "low";

export interface Company {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  color: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
  is_owned: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  specialty: string | null;
  notes: string | null;
  color: string | null;
  legacy_contact_id: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  type: ContactType;
  notes: string | null;
  bio: string | null;
  photo_path?: string | null;
  photo_url?: string | null;
  created_at: string;
}

export interface VendorPerson {
  id: string;
  vendor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  bio: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  company_id: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
  created_at: string;
}

export interface PersonRelationship {
  id: string;
  user_id: string;
  source_contact_id: string;
  target_contact_id: string;
  strength: RelationshipStrength;
  is_inferred: boolean;
  evidence_type: RelationshipEvidenceType;
  evidence_company_id: string | null;
  evidence_project_id: string | null;
  last_confirmed_at: string | null;
  how_they_know_each_other: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  evidence_company?: Company | null;
  evidence_project?: Project | null;
}

export interface IntroRequest {
  id: string;
  user_id: string;
  requester_contact_id: string | null;
  connector_contact_id: string;
  target_contact_id: string;
  status: IntroRequestStatus;
  message_draft: string | null;
  requested_at: string | null;
  resolved_at: string | null;
  outcome_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  user_id: string;
  contact_id: string;
  company_id: string | null;
  project_id: string | null;
  objective: string;
  notes: string | null;
  scheduled_for: string;
  completed_at: string | null;
  completion_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  display_name: string | null;
  avatar_url: string | null;
}

export interface ContactWithRelations extends Contact {
  contact_companies: { companies: Company }[];
  contact_projects: { projects: Project }[];
}

export interface VendorWithRelations extends Vendor {
  vendor_people: VendorPerson[];
  vendor_companies: { companies: Company }[];
  vendor_projects: { projects: Project }[];
}

export interface IntroPathResult {
  pathType: "direct" | "warm_intro" | "unreachable";
  target: ContactWithRelations;
  connector: ContactWithRelations | null;
  relationship: PersonRelationship | null;
  confidence: IntroConfidence;
  warning: string | null;
  rationale: string[];
  routeNodeIds: string[];
  routeEdgeIds: string[];
  existingRequest: IntroRequest | null;
}

export interface NetworkData {
  contacts: ContactWithRelations[];
  companies: Company[];
  vendors: VendorWithRelations[];
  projects: Project[];
  relationships: PersonRelationship[];
  introRequests: IntroRequest[];
  followUps?: FollowUp[];
  currentUser?: UserProfile;
}
