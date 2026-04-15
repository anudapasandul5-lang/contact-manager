import type {
  Company,
  ContactWithRelations,
  IntroConfidence,
  IntroPathResult,
  IntroRequest,
  NetworkData,
  PersonRelationship,
  RelationshipStrength,
} from "@/lib/supabase/types";

const strengthScore: Record<RelationshipStrength, number> = {
  weak: 1,
  warm: 2,
  strong: 3,
};

function sortPair(a: string, b: string) {
  return a < b ? [a, b] as const : [b, a] as const;
}

function pairKey(a: string, b: string) {
  const [left, right] = sortPair(a, b);
  return `${left}::${right}`;
}

function toNodeId(contactId: string) {
  return `contact-${contactId}`;
}

function toRelationshipEdgeId(a: string, b: string) {
  const [left, right] = sortPair(a, b);
  return `relationship-${left}-${right}`;
}

function relationshipRank(relationship: PersonRelationship) {
  const confirmedAt = relationship.last_confirmed_at ? Date.parse(relationship.last_confirmed_at) : 0;
  const stalenessPenalty =
    confirmedAt === 0
      ? relationship.is_inferred
        ? 2
        : 1
      : Date.now() - confirmedAt > 1000 * 60 * 60 * 24 * 365
        ? 2
        : 0;

  return {
    explicitBonus: relationship.is_inferred ? 0 : 1,
    strength: strengthScore[relationship.strength],
    recency: confirmedAt,
    stalenessPenalty,
  };
}

function compareRelationships(a: PersonRelationship, b: PersonRelationship) {
  const rankA = relationshipRank(a);
  const rankB = relationshipRank(b);

  if (rankA.explicitBonus !== rankB.explicitBonus) {
    return rankB.explicitBonus - rankA.explicitBonus;
  }

  if (rankA.strength !== rankB.strength) {
    return rankB.strength - rankA.strength;
  }

  if (rankA.stalenessPenalty !== rankB.stalenessPenalty) {
    return rankA.stalenessPenalty - rankB.stalenessPenalty;
  }

  return rankB.recency - rankA.recency;
}

function pickExistingRequest(introRequests: IntroRequest[], connectorId: string | null, targetId: string) {
  return (
    introRequests
      .filter((request) => request.connector_contact_id === connectorId && request.target_contact_id === targetId)
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0] ?? null
  );
}

function buildRouteEdgeIds(
  target: ContactWithRelations,
  connector?: ContactWithRelations | null,
  relationship?: PersonRelationship | null,
) {
  const routeEdgeIds: string[] = [];

  if (connector) {
    routeEdgeIds.push(toRelationshipEdgeId(connector.id, target.id));
  }

  const targetOwnedCompany = (target.contact_companies ?? []).find(({ companies }) => companies.is_owned)?.companies;
  if (targetOwnedCompany) {
    routeEdgeIds.push(`center-company-${targetOwnedCompany.id}`);
    routeEdgeIds.push(`company-${targetOwnedCompany.id}-contact-${target.id}`);
  }

  if (connector) {
    const connectorOwnedCompany = (connector.contact_companies ?? []).find(({ companies }) => companies.is_owned)?.companies;
    if (connectorOwnedCompany) {
      routeEdgeIds.push(`center-company-${connectorOwnedCompany.id}`);
      routeEdgeIds.push(`company-${connectorOwnedCompany.id}-contact-${connector.id}`);
    }
  }

  if (relationship?.evidence_company_id) {
    routeEdgeIds.push(`company-${relationship.evidence_company_id}-contact-${target.id}`);
    if (connector) {
      routeEdgeIds.push(`company-${relationship.evidence_company_id}-contact-${connector.id}`);
    }
  }

  if (relationship?.evidence_project_id) {
    routeEdgeIds.push(`contact-${target.id}-project-${relationship.evidence_project_id}`);
    if (connector) {
      routeEdgeIds.push(`contact-${connector.id}-project-${relationship.evidence_project_id}`);
    }
  }

  return [...new Set(routeEdgeIds)];
}

function buildRouteNodeIds(
  target: ContactWithRelations,
  connector?: ContactWithRelations | null,
  relationship?: PersonRelationship | null,
) {
  const routeNodeIds = new Set<string>(["center", toNodeId(target.id)]);

  if (connector) {
    routeNodeIds.add(toNodeId(connector.id));
  }

  const targetOwnedCompany = (target.contact_companies ?? []).find(({ companies }) => companies.is_owned)?.companies;
  if (targetOwnedCompany) {
    routeNodeIds.add(`company-${targetOwnedCompany.id}`);
  }

  if (connector) {
    const connectorOwnedCompany = (connector.contact_companies ?? []).find(({ companies }) => companies.is_owned)?.companies;
    if (connectorOwnedCompany) {
      routeNodeIds.add(`company-${connectorOwnedCompany.id}`);
    }
  }

  if (relationship?.evidence_company_id) {
    routeNodeIds.add(`company-${relationship.evidence_company_id}`);
  }

  if (relationship?.evidence_project_id) {
    routeNodeIds.add(`project-${relationship.evidence_project_id}`);
  }

  return [...routeNodeIds];
}

function getConfidence(relationship: PersonRelationship | null, isDirect: boolean): IntroConfidence {
  if (isDirect) {
    return "high";
  }

  if (!relationship) {
    return "low";
  }

  const stale =
    !relationship.last_confirmed_at ||
    Date.now() - Date.parse(relationship.last_confirmed_at) > 1000 * 60 * 60 * 24 * 365;

  if (!relationship.is_inferred && relationship.strength === "strong" && !stale) {
    return "high";
  }

  if (!relationship.is_inferred && relationship.strength !== "weak") {
    return "medium";
  }

  return "low";
}

function getRelationshipWarning(relationship: PersonRelationship | null) {
  if (!relationship) {
    return "No reliable connector path is available yet. Add a manual relationship to unlock warm intros.";
  }

  if (relationship.is_inferred) {
    return "This route is inferred from shared work context, so confirm the relationship before asking for an intro.";
  }

  if (!relationship.last_confirmed_at) {
    return "This route has a manual relationship, but it has never been confirmed with a date.";
  }

  if (Date.now() - Date.parse(relationship.last_confirmed_at) > 1000 * 60 * 60 * 24 * 365) {
    return "This relationship may be stale because it has not been confirmed in over a year.";
  }

  if (relationship.strength === "weak") {
    return "This is the shortest route, but the connector strength is weak.";
  }

  return null;
}

function describeEvidence(relationship: PersonRelationship | null, contactsById: Map<string, ContactWithRelations>) {
  if (!relationship) {
    return [];
  }

  const source = contactsById.get(relationship.source_contact_id);
  const target = contactsById.get(relationship.target_contact_id);
  const rationale: string[] = [];

  rationale.push(
    relationship.is_inferred
      ? "Shortest available path uses an inferred connector."
      : "Shortest available path uses an explicit connector relationship.",
  );
  rationale.push(`Connector strength is marked as ${relationship.strength}.`);

  if (source && target) {
    rationale.push(`${source.name} is the best available bridge to ${target.name}.`);
  }

  if (relationship.evidence_company) {
    rationale.push(`This path is supported by shared company context at ${relationship.evidence_company.name}.`);
  }

  if (relationship.evidence_project) {
    rationale.push(`This path is supported by shared project context on ${relationship.evidence_project.name}.`);
  }

  if (relationship.last_confirmed_at) {
    rationale.push(`Last confirmed on ${new Date(relationship.last_confirmed_at).toLocaleDateString()}.`);
  }

  return rationale;
}

function hasOwnedCompany(contact: ContactWithRelations) {
  return (contact.contact_companies ?? []).some(({ companies }) => companies.is_owned);
}

export function isDirectNetworkContact(contact: ContactWithRelations) {
  return contact.type === "employee" || hasOwnedCompany(contact);
}

export function getDirectNetworkContacts(data: NetworkData) {
  return data.contacts.filter(isDirectNetworkContact);
}

export function buildInferredRelationships(
  contacts: ContactWithRelations[],
  explicitRelationships: PersonRelationship[],
) {
  const explicitKeys = new Set(
    explicitRelationships.map((relationship) => pairKey(relationship.source_contact_id, relationship.target_contact_id)),
  );

  const inferred = new Map<string, PersonRelationship>();

  for (let i = 0; i < contacts.length; i += 1) {
    for (let j = i + 1; j < contacts.length; j += 1) {
      const left = contacts[i];
      const right = contacts[j];
      const key = pairKey(left.id, right.id);

      if (explicitKeys.has(key)) {
        continue;
      }

      const sharedProjects = (left.contact_projects ?? [])
        .map(({ projects }) => projects)
        .filter((project) => (right.contact_projects ?? []).some(({ projects }) => projects.id === project.id));

      const sharedCompanies = (left.contact_companies ?? [])
        .map(({ companies }) => companies)
        .filter((company) => (right.contact_companies ?? []).some(({ companies }) => companies.id === company.id));

      if (sharedProjects.length === 0 && sharedCompanies.length === 0) {
        continue;
      }

      const evidenceProject = sharedProjects[0] ?? null;
      const evidenceCompany = evidenceProject ? null : sharedCompanies[0] ?? null;
      const [sourceContactId, targetContactId] = sortPair(left.id, right.id);

      inferred.set(key, {
        id: evidenceProject
          ? `inferred-project-${evidenceProject.id}-${sourceContactId}-${targetContactId}`
          : `inferred-company-${evidenceCompany?.id}-${sourceContactId}-${targetContactId}`,
        user_id: left.user_id,
        source_contact_id: sourceContactId,
        target_contact_id: targetContactId,
        strength: evidenceProject ? "warm" : "weak",
        is_inferred: true,
        evidence_type: evidenceProject ? "shared_project" : "shared_company",
        evidence_company_id: evidenceCompany?.id ?? null,
        evidence_project_id: evidenceProject?.id ?? null,
        last_confirmed_at: null,
        how_they_know_each_other: evidenceProject
          ? `Worked together on ${evidenceProject.name}`
          : evidenceCompany
            ? `Shared company context at ${evidenceCompany.name}`
            : null,
        notes: null,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
        evidence_company: evidenceCompany,
        evidence_project: evidenceProject,
      });
    }
  }

  return [...inferred.values()].sort(compareRelationships);
}

export function findBestIntroPath(data: NetworkData, targetContactId: string): IntroPathResult | null {
  const target = data.contacts.find((contact) => contact.id === targetContactId);
  if (!target) {
    return null;
  }

  const contactsById = new Map(data.contacts.map((contact) => [contact.id, contact]));
  const directContacts = getDirectNetworkContacts(data).filter((contact) => contact.id !== target.id);
  const relationshipMap = new Map<string, PersonRelationship[]>();

  data.relationships.forEach((relationship) => {
    const key = pairKey(relationship.source_contact_id, relationship.target_contact_id);
    const list = relationshipMap.get(key) ?? [];
    list.push(relationship);
    relationshipMap.set(key, list);
  });

  if (isDirectNetworkContact(target)) {
    return {
      pathType: "direct",
      target,
      connector: null,
      relationship: null,
      confidence: "high",
      warning: null,
      rationale: ["This person is already in your direct founder network."],
      routeNodeIds: buildRouteNodeIds(target),
      routeEdgeIds: buildRouteEdgeIds(target),
      existingRequest: pickExistingRequest(data.introRequests, target.id, target.id),
    };
  }

  const rankedCandidates = directContacts
    .map((connector) => {
      const relationships = relationshipMap.get(pairKey(connector.id, target.id)) ?? [];
      const bestRelationship = [...relationships].sort(compareRelationships)[0] ?? null;
      return { connector, relationship: bestRelationship };
    })
    .filter((candidate) => candidate.relationship);

  if (rankedCandidates.length === 0) {
    return {
      pathType: "unreachable",
      target,
      connector: null,
      relationship: null,
      confidence: "low",
      warning: getRelationshipWarning(null),
      rationale: ["No trusted first-degree connector is linked to this target yet."],
      routeNodeIds: [toNodeId(target.id)],
      routeEdgeIds: [],
      existingRequest: null,
    };
  }

  rankedCandidates.sort((left, right) => compareRelationships(left.relationship!, right.relationship!));
  const best = rankedCandidates[0];

  return {
    pathType: "warm_intro",
    target,
    connector: best.connector,
    relationship: best.relationship,
    confidence: getConfidence(best.relationship, false),
    warning: getRelationshipWarning(best.relationship),
    rationale: describeEvidence(best.relationship, contactsById),
    routeNodeIds: buildRouteNodeIds(target, best.connector, best.relationship),
    routeEdgeIds: buildRouteEdgeIds(target, best.connector, best.relationship),
    existingRequest: pickExistingRequest(data.introRequests, best.connector.id, target.id),
  };
}

export function getStrongConnectorIds(data: NetworkData) {
  const directIds = new Set(getDirectNetworkContacts(data).map((contact) => contact.id));
  const strongIds = new Set<string>();

  data.relationships.forEach((relationship) => {
    if (relationship.strength !== "strong" || relationship.is_inferred) {
      return;
    }

    if (directIds.has(relationship.source_contact_id) || directIds.has(relationship.target_contact_id)) {
      strongIds.add(relationship.source_contact_id);
      strongIds.add(relationship.target_contact_id);
    }
  });

  return strongIds;
}

export function getRecentlyConfirmedRelationshipIds(data: NetworkData) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 180;
  return new Set(
    data.relationships
      .filter((relationship) => relationship.last_confirmed_at && Date.parse(relationship.last_confirmed_at) >= cutoff)
      .map((relationship) => relationship.id),
  );
}

export function getLowConfidenceTargetIds(data: NetworkData) {
  const ids = new Set<string>();

  data.contacts.forEach((contact) => {
    if (isDirectNetworkContact(contact)) {
      return;
    }

    const path = findBestIntroPath(data, contact.id);
    if (path && path.confidence === "low") {
      ids.add(contact.id);
    }
  });

  return ids;
}

export function getOwnedCompaniesForContact(contact: ContactWithRelations) {
  return (contact.contact_companies ?? [])
    .map(({ companies }) => companies)
    .filter((company: Company) => company.is_owned);
}
