"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { EntityImageField } from "@/components/shared/EntityImageField";
import {
  deleteEntityMediaClient,
  uploadEntityMediaClient,
} from "@/lib/media/client";
import type { Company, ContactType, ContactWithRelations, Project, ProjectStatus } from "@/lib/supabase/types";

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
};

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  employee: "Employee",
  vendor: "Vendor",
  investor: "Investor",
  cofounder: "Co-founder",
  partner: "Partner",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface DraftPerson {
  id: string;
  name: string;
  role: string;
  email: string;
  type: ContactType;
}

interface ProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSaved: () => void;
}

export function ProjectModal({ open, onOpenChange, project, onSaved }: ProjectModalProps) {
  const qc = useQueryClient();
  const NONE_COMPANY_VALUE = "__none__";
  const existingProjectId = project?.id ?? null;
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [companyId, setCompanyId] = useState<string>("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allContacts, setAllContacts] = useState<ContactWithRelations[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [draftPeople, setDraftPeople] = useState<DraftPerson[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const [persistedProjectId, setPersistedProjectId] = useState<string | null>(null);

  const activeProjectId = existingProjectId ?? persistedProjectId;
  const displayedImageUrl = removeImage ? null : (previewUrl ?? mediaUrl);
  const canRemoveImage = Boolean(displayedImageUrl || selectedFile || mediaUrl);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;

    fetch("/api/contacts")
      .then((response) => response.json())
      .then((contacts) => {
        setAllContacts(Array.isArray(contacts) ? (contacts as ContactWithRelations[]) : []);
      })
      .catch(() => {
        setAllContacts([]);
      });
  }, [open]);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setStatus(project.status);
      setCompanyId(project.company_id || "");
      setMediaUrl(project.logo_url || null);
      setSelectedContactIds(
        allContacts
          .filter((contact) =>
            (contact.contact_projects ?? []).some(({ projects }) => projects.id === project.id),
          )
          .map((contact) => contact.id),
      );
    } else {
      setName("");
      setStatus("planning");
      setCompanyId("");
      setMediaUrl(null);
      setSelectedContactIds([]);
    }
    setContactSearch("");
    setDraftPeople([]);
    setPersistedProjectId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(false);
    setMediaError(null);
    setMediaStatus(null);
    setError(null);
  }, [project, open, allContacts]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function toggleContactId(id: string) {
    setSelectedContactIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function updateDraftPerson(id: string, field: keyof DraftPerson, value: string) {
    setDraftPeople((current) =>
      current.map((person) => (person.id === id ? { ...person, [field]: value } : person)),
    );
  }

  function addDraftPerson() {
    setDraftPeople((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        role: "",
        email: "",
        type: "employee",
      },
    ]);
  }

  function removeDraftPerson(id: string) {
    setDraftPeople((current) => current.filter((person) => person.id !== id));
  }

  function handleFileSelect(file: File | null) {
    setSelectedFile(file);
    setRemoveImage(false);
    setMediaError(null);
    setMediaStatus(file ? "Logo will upload after you save." : null);
  }

  function handleRemoveImage() {
    setSelectedFile(null);
    setMediaError(null);

    if (displayedImageUrl || mediaUrl) {
      setRemoveImage(true);
      setMediaStatus(activeProjectId ? "Logo will be removed when you save." : "Logo selection cleared.");
      return;
    }

    setRemoveImage(false);
    setMediaStatus(null);
  }

  async function syncMedia(projectId: string) {
    if (selectedFile) {
      const media = await uploadEntityMediaClient("project", projectId, selectedFile);
      setMediaUrl(media.signedUrl);
      setSelectedFile(null);
      setRemoveImage(false);
      setMediaStatus("Logo uploaded.");
      return;
    }

    if (removeImage && mediaUrl) {
      await deleteEntityMediaClient("project", projectId);
      setMediaUrl(null);
      setRemoveImage(false);
      setMediaStatus("Logo removed.");
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const invalidDraft = draftPeople.find((person) => !person.name.trim());
    if (invalidDraft) {
      setError("Each new person needs a name.");
      return;
    }

    setSaving(true);
    setError(null);
    setMediaError(null);
    try {
      const method = activeProjectId ? "PUT" : "POST";
      const url = activeProjectId ? `/api/projects/${activeProjectId}` : "/api/projects";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), status, company_id: companyId || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Failed to save.");
        return;
      }
      const savedProjectId = activeProjectId ?? data?.id;

      if (!savedProjectId) {
        setError("Project saved, but the project id was missing.");
        return;
      }
      setPersistedProjectId(savedProjectId);

      const initiallyLinkedIds = new Set(
        allContacts
          .filter((contact) =>
            existingProjectId ? (contact.contact_projects ?? []).some(({ projects }) => projects.id === existingProjectId) : false,
          )
          .map((contact) => contact.id),
      );

      const selectedIds = new Set(selectedContactIds);
      const changedContacts = allContacts.filter((contact) => {
        const wasLinked = initiallyLinkedIds.has(contact.id);
        const isLinked = selectedIds.has(contact.id);
        return wasLinked !== isLinked;
      });

      for (const contact of changedContacts) {
        const companyIds = (contact.contact_companies ?? []).map(({ companies }) => companies.id);
        const nextProjectIds = (contact.contact_projects ?? [])
          .map(({ projects }) => projects.id)
          .filter((linkedProjectId) => linkedProjectId !== savedProjectId);

        if (selectedIds.has(contact.id)) {
          nextProjectIds.push(savedProjectId);
        }

        const uniqueProjectIds = [...new Set(nextProjectIds)];

        const contactResponse = await fetch(`/api/contacts/${contact.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            role: contact.role,
            bio: contact.bio,
            type: contact.type,
            companyIds,
            projectIds: uniqueProjectIds,
          }),
        });

        const contactResult = await contactResponse.json().catch(() => null);
        if (!contactResponse.ok) {
          setError(contactResult?.error || `Failed to update ${contact.name}.`);
          return;
        }
      }

      for (const person of draftPeople) {
        const contactResponse = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: person.name.trim(),
            email: person.email.trim() || null,
            phone: null,
            role: person.role.trim() || null,
            bio: null,
            type: person.type,
            companyIds: [],
            projectIds: [savedProjectId],
          }),
        });

        const contactResult = await contactResponse.json().catch(() => null);
        if (!contactResponse.ok) {
          setError(contactResult?.error || `Failed to create ${person.name}.`);
          return;
        }
      }

      if (selectedFile || (removeImage && mediaUrl)) {
        try {
          await syncMedia(savedProjectId);
        } catch (mediaSyncError) {
          qc.invalidateQueries({ queryKey: queryKeys.projects.all });
          qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
          qc.invalidateQueries({ queryKey: queryKeys.network.all });
          onSaved();
          setMediaError(mediaSyncError instanceof Error ? mediaSyncError.message : "Failed to update logo.");
          setMediaStatus("Project saved. You can retry the logo upload.");
          return;
        }
      }

      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      qc.invalidateQueries({ queryKey: queryKeys.network.all });
      onSaved();
      onOpenChange(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const filteredContacts = allContacts
    .filter((contact) => {
      const query = contactSearch.trim().toLowerCase();
      if (!query) return true;
      return (
        contact.name.toLowerCase().includes(query) ||
        (contact.role ?? "").toLowerCase().includes(query) ||
        (contact.email ?? "").toLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      const leftSelected = selectedContactIds.includes(left.id);
      const rightSelected = selectedContactIds.includes(right.id);
      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add Project"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Project Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brand Refresh"
            />
          </div>

          <EntityImageField
            label="Project logo"
            name={name || project?.name || "Project"}
            imageUrl={displayedImageUrl}
            shape="rounded"
            fileName={selectedFile?.name ?? null}
            status={mediaStatus}
            error={mediaError}
            canRemove={canRemoveImage}
            disabled={saving}
            onFileSelect={handleFileSelect}
            onRemove={handleRemoveImage}
            fallback={
              <div
                className="flex h-full w-full items-center justify-center rounded-2xl text-sm font-extrabold"
                style={{
                  background: "linear-gradient(145deg, #e0e7ff, #c7d2fe)",
                  color: "#4338ca",
                }}
              >
                {getInitials(name || project?.name || "Project")}
              </div>
            }
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger className="w-full">
                <span>{PROJECT_STATUS_LABELS[status]}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">{PROJECT_STATUS_LABELS.planning}</SelectItem>
                <SelectItem value="active">{PROJECT_STATUS_LABELS.active}</SelectItem>
                <SelectItem value="completed">{PROJECT_STATUS_LABELS.completed}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Company (optional)</label>
            <Select
              value={companyId || NONE_COMPANY_VALUE}
              onValueChange={(value) => setCompanyId(value == null || value === NONE_COMPANY_VALUE ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <span>{companies.find((company) => company.id === companyId)?.name ?? "None"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_COMPANY_VALUE}>None</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">People</label>
              <span className="text-xs text-muted-foreground">
                Connect existing contacts or create new ones for this project
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Existing People</label>
              <Input
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                placeholder="Search people by name, role, or email"
              />
              <div className="max-h-52 overflow-y-auto rounded-lg border p-2 flex flex-col gap-1">
                {filteredContacts.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">No matching contacts yet.</p>
                ) : (
                  filteredContacts.map((contact) => {
                    const linkedProjectNames = (contact.contact_projects ?? [])
                      .map(({ projects }) => projects.name)
                      .filter((projectName) => !project || projectName !== project.name)
                      .slice(0, 2);

                    return (
                      <label
                        key={contact.id}
                        className="flex items-start gap-3 cursor-pointer rounded px-2 py-2 hover:bg-muted text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => toggleContactId(contact.id)}
                          className="accent-indigo-500 mt-1 h-3.5 w-3.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{contact.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {CONTACT_TYPE_LABELS[contact.type]}
                            {contact.role ? ` · ${contact.role}` : ""}
                          </div>
                          {linkedProjectNames.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Also on {linkedProjectNames.join(", ")}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">New People</label>
                <Button type="button" variant="outline" size="sm" onClick={addDraftPerson}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add New Person
                </Button>
              </div>

              {draftPeople.length > 0 && (
                <div className="flex flex-col gap-3">
                  {draftPeople.map((person) => (
                    <div key={person.id} className="rounded-lg border p-3 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">New person</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeDraftPerson(person.id)}
                        >
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Name *</label>
                          <Input
                            value={person.name}
                            onChange={(event) => updateDraftPerson(person.id, "name", event.target.value)}
                            placeholder="Full name"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Type</label>
                          <select
                            value={person.type}
                            onChange={(event) => updateDraftPerson(person.id, "type", event.target.value)}
                            className="h-8 rounded-lg border bg-background px-3 text-sm"
                          >
                            <option value="employee">{CONTACT_TYPE_LABELS.employee}</option>
                            <option value="vendor">{CONTACT_TYPE_LABELS.vendor}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Role</label>
                          <Input
                            value={person.role}
                            onChange={(event) => updateDraftPerson(person.id, "role", event.target.value)}
                            placeholder="e.g. Designer"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Email</label>
                          <Input
                            value={person.email}
                            onChange={(event) => updateDraftPerson(person.id, "email", event.target.value)}
                            placeholder="email@example.com"
                            type="email"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : project ? "Save Changes" : "Add Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
