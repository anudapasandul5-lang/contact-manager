// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it } from "vitest";
import { Handle, Position, ReactFlowProvider } from "@xyflow/react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactCard } from "@/components/contacts/ContactCard";
import { CompanyNode } from "@/components/mind-map/CompanyNode";
import { ContactNode } from "@/components/mind-map/ContactNode";
import { ProjectNode } from "@/components/mind-map/ProjectNode";

function renderWithFlowProvider(node: ReactElement) {
  return renderToStaticMarkup(<ReactFlowProvider>{node}</ReactFlowProvider>);
}

function collectElementsByType(node: ReactNode, type: unknown): ReactElement[] {
  if (!isValidElement(node)) {
    return [];
  }

  const matches = node.type === type ? [node] : [];
  const childNodes = (node.props as { children?: ReactNode }).children;

  if (!childNodes) {
    return matches;
  }

  const children = Array.isArray(childNodes) ? childNodes : [childNodes];
  return matches.concat(children.flatMap((child) => collectElementsByType(child, type)));
}

describe("ContactCard renders an image when a contact photo URL is present", () => {
  const markup = renderToStaticMarkup(
    <ContactCard
      contact={{
        id: "contact-1",
        user_id: "user-1",
        name: "Sarah Johnson",
        email: null,
        phone: null,
        role: "PM",
        type: "employee",
        notes: null,
        bio: null,
        photo_path: "path/profile.jpg",
        photo_url: "https://signed.test/photo.jpg",
        created_at: "2026-04-01T00:00:00.000Z",
        contact_companies: [],
        contact_projects: [],
      }}
      onEdit={() => {}}
      onDelete={() => {}}
    />,
  );

  assert.match(markup, /<img[^>]+src="https:\/\/signed\.test\/photo\.jpg"/);
});

describe("CompanyNode renders an image when a company logo URL is present", () => {
  const props = {
    id: "company-1",
    data: {
      label: "Alpha Corp",
      initials: "AC",
      logoUrl: "https://signed.test/company.png",
      color: "#3b82f6",
      isOwned: true,
      contactCount: 3,
    },
  } as unknown as Parameters<typeof CompanyNode>[0];

  const markup = renderWithFlowProvider(
    <CompanyNode {...props} />,
  );

  assert.match(markup, /<img[^>]+src="https:\/\/signed\.test\/company\.png"/);
  assert.match(markup, /object-contain/);
  assert.match(markup, /background:rgba\(255,255,255,0\.92\)/);
});

describe("ContactNode renders an image when a profile photo URL is present", () => {
  const props = {
    id: "contact-1",
    data: {
      label: "Sarah Johnson",
      initials: "SJ",
      photoUrl: "https://signed.test/contact.png",
      contactType: "employee",
      isShared: false,
      companyNames: [],
    },
  } as unknown as Parameters<typeof ContactNode>[0];

  const markup = renderWithFlowProvider(
    <ContactNode {...props} />,
  );

  assert.match(markup, /<img[^>]+src="https:\/\/signed\.test\/contact\.png"/);
});

describe("ProjectNode renders an image when a project logo URL is present", () => {
  const props = {
    id: "project-1",
    data: {
      label: "Launch",
      logoUrl: "https://signed.test/project.webp",
      status: "active",
    },
  } as unknown as Parameters<typeof ProjectNode>[0];

  const markup = renderWithFlowProvider(
    <ProjectNode {...props} />,
  );

  assert.match(markup, /<img[^>]+src="https:\/\/signed\.test\/project\.webp"/);
  assert.match(markup, /object-contain/);
  assert.match(markup, /background:rgba\(255,255,255,0\.92\)/);
});

describe("ProjectNode exposes both inbound and outbound handles for standalone project edges", () => {
  const tree = ProjectNode({
    id: "project-1",
    data: {
      label: "Launch",
      status: "active",
    },
  } as never);
  const handles = collectElementsByType(tree, Handle);

  assert.ok(
    handles.some((handle) => {
      const props = handle.props as { type?: unknown; position?: unknown };
      return props.type === "target" && props.position === Position.Left;
    }),
    "expected ProjectNode to render a left target handle",
  );
  assert.ok(
    handles.some((handle) => {
      const props = handle.props as { type?: unknown; position?: unknown };
      return props.type === "source" && props.position === Position.Right;
    }),
    "expected ProjectNode to render a right source handle",
  );
});
