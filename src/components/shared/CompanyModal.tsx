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
import { EntityImageField } from "@/components/shared/EntityImageField";
import {
  deleteEntityMediaClient,
  uploadEntityMediaClient,
} from "@/lib/media/client";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";
import type { Company, ContactType, ContactWithRelations } from "@/lib/supabase/types";

const PRESET_COLORS = [
  "#3b82f6", // blue (owned default)
  "#0d9488", // teal (partner default)
  "#8b5cf6", // violet
  "#f97316", // orange
  "#22c55e", // green
  "#ec4899", // pink
];

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

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
  onSaved: () => void;
  onDeleted?: (companyId: string) => void;
}

export function CompanyModal({ open, onOpenChange, company, onSaved, onDeleted }: CompanyModalProps) {
  const qc = useQueryClient();
  const existingCompanyId = company?.id ?? null;
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isOwned, setIsOwned] = useState(true);
  const [allContacts, setAllContacts] = useState<ContactWithRelations[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [draftPeople, setDraftPeople] = useState<DraftPerson[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const [persistedCompanyId, setPersistedCompanyId] = useState<string | null>(null);

  const activeCompanyId = existingCompanyId ?? persistedCompanyId;
  const displayedImageUrl = removeImage ? null : (previewUrl ?? mediaUrl);
  const canRemoveImage = Boolean(displayedImageUrl || selectedFile || mediaUrl);

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
    if (company) {
      setName(company.name);
      setIndustry(company.industry);
      setColor(company.color || PRESET_COLORS[0]);
      setIsOwned(company.is_owned);
      setMediaUrl(company.logo_url || null);
      setSelectedContactIds(
        allContacts
          .filter((contact) =>
            (contact.contact_companies ?? []).some(({ companies }) => companies.id === company.id),
          )
          .map((contact) => contact.id),
      );
    } else {
      setName("");
      setIndustry("");
      setColor(PRESET_COLORS[0]);
      setIsOwned(true);
      setMediaUrl(null);
      setSelectedContactIds([]);
    }
    setContactSearch("");
    setDraftPeople([]);
    setPersistedCompanyId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(false);
    setMediaError(null);
    setMediaStatus(null);
    setError(null);
    setConfirmDelete(false);
  }, [company, open, allContacts]);

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
      setMediaStatus(activeCompanyId ? "Logo will be removed when you save." : "Logo selection cleared.");
      return;
    }

    setRemoveImage(false);
    setMediaStatus(null);
  }

  async function syncMedia(companyId: string) {
    if (selectedFile) {
      const media = await uploadEntityMediaClient("company", companyId, selectedFile);
      setMediaUrl(media.signedUrl);
      setSelectedFile(null);
      setRemoveImage(false);
      setMediaStatus("Logo uploaded.");
      return;
    }

    if (removeImage && mediaUrl) {
      await deleteEntityMediaClient("company", companyId);
      setMediaUrl(null);
      setRemoveImage(false);
      setMediaStatus("Logo removed.");
    }
  }

  function handleDelete() {
    if (!company) return;
    const companyId = company.id;

    // Close immediately for instant UX
    onDeleted?.(companyId);
    onSaved();
    onOpenChange(false);

    fetch(`/api/companies/${companyId}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) {
          // Delete failed — reload to restore the node
          qc.invalidateQueries({ queryKey: queryKeys.companies.all });
          qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
          qc.invalidateQueries({ queryKey: queryKeys.network.all });
        } else {
          qc.invalidateQueries({ queryKey: queryKeys.companies.all });
          qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
          qc.invalidateQueries({ queryKey: queryKeys.network.all });
        }
      })
      .catch(() => {
        qc.invalidateQueries({ queryKey: queryKeys.companies.all });
        qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
        qc.invalidateQueries({ queryKey: queryKeys.network.all });
      });
  }

  async function handleSubmit() {
    if (!name.trim() || !industry.trim()) {
      setError("Name and industry are required.");
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
      const method = activeCompanyId ? "PUT" : "POST";
      const url = activeCompanyId ? `/api/companies/${activeCompanyId}` : "/api/companies";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), industry: industry.trim(), color, is_owned: isOwned }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Failed to save.");
        return;
      }

      const savedCompanyId = activeCompanyId ?? data?.id;
      if (!savedCompanyId) {
        setError("Company saved, but the company id was missing.");
        return;
      }
      setPersistedCompanyId(savedCompanyId);

      const initiallyLinkedIds = new Set(
        allContacts
          .filter((contact) =>
            existingCompanyId ? (contact.contact_companies ?? []).some(({ companies }) => companies.id === existingCompanyId) : false,
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
        const nextCompanyIds = (contact.contact_companies ?? [])
          .map(({ companies }) => companies.id)
          .filter((linkedCompanyId) => linkedCompanyId !== savedCompanyId);

        if (selectedIds.has(contact.id)) {
          nextCompanyIds.push(savedCompanyId);
        }

        const uniqueCompanyIds = [...new Set(nextCompanyIds)];
        const projectIds = (contact.contact_projects ?? []).map(({ projects }) => projects.id);

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
            companyIds: uniqueCompanyIds,
            projectIds,
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
            companyIds: [savedCompanyId],
            projectIds: [],
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
          await syncMedia(savedCompanyId);
        } catch (mediaSyncError) {
          qc.invalidateQueries({ queryKey: queryKeys.companies.all });
          qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
          qc.invalidateQueries({ queryKey: queryKeys.network.all });
          onSaved();
          setMediaError(mediaSyncError instanceof Error ? mediaSyncError.message : "Failed to update logo.");
          setMediaStatus("Company saved. You can retry the logo upload.");
          return;
        }
      }

      qc.invalidateQueries({ queryKey: queryKeys.companies.all });
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
          <DialogTitle>{company ? "Edit Company" : "Add Company"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Business type toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              type="button"
              onClick={() => setIsOwned(true)}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-colors",
                isOwned
                  ? "bg-indigo-500 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              My Business
            </button>
            <button
              type="button"
              onClick={() => setIsOwned(false)}
              className={cn(
                "flex-1 py-2 text-sm font-medium transition-colors border-l",
                !isOwned
                  ? "bg-indigo-500 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Partner / Side Biz
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Company Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alpha Corp"
            />
          </div>

          <EntityImageField
            label="Company logo"
            name={name || company?.name || "Company"}
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
                  background: `linear-gradient(145deg, ${color}22, ${color}55)`,
                  color,
                }}
              >
                {getInitials(name || company?.name || "Company")}
              </div>
            }
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Industry *</label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Technology, Real Estate"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    color === c ? "border-slate-900 scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">People</label>
              <span className="text-xs text-muted-foreground">
                Add existing contacts or create new ones for this company
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
                    const linkedCompanyNames = (contact.contact_companies ?? [])
                      .map(({ companies }) => companies.name)
                      .filter((companyName) => !company || companyName !== company.name)
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
                          {linkedCompanyNames.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Also at {linkedCompanyNames.join(", ")}
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
                            placeholder="e.g. Account Manager"
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

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          {company && (
            confirmDelete ? (
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-sm text-red-500">Delete this company?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Yes, delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mr-auto text-red-500 hover:text-red-600 hover:border-red-300"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            )
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : company ? "Save Changes" : "Add Company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
