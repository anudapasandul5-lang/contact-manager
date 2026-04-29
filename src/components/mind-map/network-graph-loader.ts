import type { Edge, Node } from "@xyflow/react";
import { fetchAllNetworkData } from "@/lib/db/queries";
import type { NetworkData } from "@/lib/supabase/types";
import {
  applySavedNodePositions,
  createCompanyCollapseStorageKey,
  createLayoutStorageKey,
  createProjectCollapseStorageKey,
  deriveLayoutOwnerId,
  readSavedNodePositions,
  restoreSavedCollapsedCompanies,
  restoreSavedCollapsedProjects,
} from "./layout-memory";
import { normalizeFollowUps, type MindMapFollowUp } from "./follow-up-helpers";

type NetworkDataWithFollowUps = NetworkData & { followUps?: unknown };

export interface LoadedNetworkGraphState {
  collapsedCompanies: Set<string>;
  collapsedProjects: Set<string>;
  companyCollapseStorageKey: string;
  data: NetworkData;
  edges: Edge[];
  followUps: MindMapFollowUp[];
  layoutStorageKey: string;
  nodes: Node[];
  projectCollapseStorageKey: string;
}

export async function loadNetworkGraphState(
  buildGraph: (data: NetworkData) => { nodes: Node[]; edges: Edge[] },
): Promise<LoadedNetworkGraphState> {
  const data = await fetchAllNetworkData();
  const layoutOwnerId = deriveLayoutOwnerId(data);
  const layoutStorageKey = createLayoutStorageKey(layoutOwnerId);
  const companyCollapseStorageKey = createCompanyCollapseStorageKey(layoutOwnerId);
  const projectCollapseStorageKey = createProjectCollapseStorageKey(layoutOwnerId);
  const savedPositions = readSavedNodePositions(layoutStorageKey);
  const graph = buildGraph(data);
  const nodes = applySavedNodePositions(graph.nodes, savedPositions);

  return {
    collapsedCompanies: restoreSavedCollapsedCompanies(
      data.companies.map((company) => company.id),
      companyCollapseStorageKey,
    ),
    collapsedProjects: restoreSavedCollapsedProjects(
      data.projects.filter((project) => !project.company_id).map((project) => project.id),
      projectCollapseStorageKey,
    ),
    companyCollapseStorageKey,
    data,
    edges: graph.edges,
    followUps: normalizeFollowUps((data as NetworkDataWithFollowUps).followUps),
    layoutStorageKey,
    nodes,
    projectCollapseStorageKey,
  };
}
