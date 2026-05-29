"use client";

import { useEffect, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import type { Company, ContactType, ContactWithRelations, Project } from "@/lib/supabase/types";

const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  employee: "Employee",
  vendor: "Vendor",
  investor: "Investor",
  cofounder: "Co-founder",
  partner: "Partner",
};

const PROJECT_STATUS_LABELS = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
} as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ContactWithRelations;
  onSaved: () => void;
}

export function ContactModal({ open, onOpenChange, contact, onSaved }: ContactModalProps) {
  const qc = useQueryClient();
  const existingContactId = contact?.id ?? null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [type, setType] = useState<ContactType>("employee");
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loadingRelations, setLoadingRelations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaStatus, setMediaStatus] = useState<string | null>(null);
  const [persistedContactId, setPersistedContactId] = useState<string | null>(null);
  const [addAnother, setAddAnother] = useState(false);
  const [successFlash, setSuccessFlash] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); };
  }, []);

  const activeContactId = existingContactId ?? persistedContactId;
  const displayedImageUrl = removeImage ? null : (previewUrl ?? mediaUrl);
  const canRemoveImage = Boolean(displayedImageUrl || selectedFile || mediaUrl);

  useEffect(() => {
    setLoadingRelations(true);
    Promise.all([
      fetch("/api/companies").then((r) => r.ok ? r.json() : []),
      fetch("/api/projects").then((r) => r.ok ? r.json() : []),
    ])
      .then(([companies, projects]) => {
        setAllCompanies(Array.isArray(companies) ? companies : []);
        setAllProjects(Array.isArray(projects) ? projects : []);
      })
      .catch(() => {})
      .finally(() => setLoadingRelations(false));
  }, []);

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setEmail(contact.email || "");
      setPhone(contact.phone || "");
      setRole(contact.role || "");
      setBio(contact.bio || "");
      setType(contact.type);
      setMediaUrl(contact.photo_url || null);
      setCompanyIds((contact.contact_companies ?? []).map((cc) => cc.companies.id));
      setProjectIds((contact.contact_projects ?? []).map((cp) => cp.projects.id));
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setRole("");
      setBio("");
      setType("employee");
      setMediaUrl(null);
      setCompanyIds([]);
      setProjectIds([]);
    }
    setPersistedContactId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(false);
    setMediaError(null);
    setMediaStatus(null);
    setError(null);
    setSuccessFlash(null);
  }, [contact, open]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function resetFormForNextAdd() {
    setName("");
    setEmail("");
    setPhone("");
    setRole("");
    setBio("");
    setType("employee");
    setMediaUrl(null);
    setCompanyIds([]);
    setProjectIds([]);
    setPersistedContactId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(false);
    setMediaError(null);
    setMediaStatus(null);
    setError(null);
  }

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function handleFileSelect(file: File | null) {
    setSelectedFile(file);
    setRemoveImage(false);
    setMediaError(null);
    setMediaStatus(file ? "Photo will upload after you save." : null);
  }

  function handleRemoveImage() {
    setSelectedFile(null);
    setMediaError(null);

    if (displayedImageUrl || mediaUrl) {
      setRemoveImage(true);
      setMediaStatus(activeContactId ? "Photo will be removed when you save." : "Photo selection cleared.");
      return;
    }

    setRemoveImage(false);
    setMediaStatus(null);
  }

  async function syncMedia(contactId: string) {
    if (selectedFile) {
      const media = await uploadEntityMediaClient("contact", contactId, selectedFile);
      setMediaUrl(media.signedUrl);
      setSelectedFile(null);
      setRemoveImage(false);
      setMediaStatus("Photo uploaded.");
      return;
    }

    if (removeImage && mediaUrl) {
      await deleteEntityMediaClient("contact", contactId);
      setMediaUrl(null);
      setRemoveImage(false);
      setMediaStatus("Photo removed.");
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setMediaError(null);
    try {
      const method = activeContactId ? "PUT" : "POST";
      const url = activeContactId ? `/api/contacts/${activeContactId}` : "/api/contacts";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          role: role.trim() || null,
          bio: bio.trim() || null,
          type,
          companyIds,
          projectIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save.");
        return;
      }
      const savedContact = await res.json().catch(() => null);
      const savedContactId = activeContactId ?? savedContact?.id;
      if (!savedContactId) {
        setError("Contact saved, but the contact id was missing.");
        return;
      }

      setPersistedContactId(savedContactId);

      if (selectedFile || (removeImage && mediaUrl)) {
        try {
          await syncMedia(savedContactId);
        } catch (mediaSyncError) {
          qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
          qc.invalidateQueries({ queryKey: queryKeys.network.all });
          onSaved();
          setMediaError(mediaSyncError instanceof Error ? mediaSyncError.message : "Failed to update photo.");
          setMediaStatus("Contact saved. You can retry the photo upload.");
          return;
        }
      }

      qc.invalidateQueries({ queryKey: queryKeys.contacts.all });
      qc.invalidateQueries({ queryKey: queryKeys.network.all });
      onSaved();
      if (addAnother) {
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        setSuccessFlash(`${name.trim()} added ✓`);
        flashTimerRef.current = setTimeout(() => setSuccessFlash(null), 2000);
        resetFormForNextAdd();
      } else {
        onOpenChange(false);
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as ContactType)}>
                <SelectTrigger className="w-full">
                  <span>{CONTACT_TYPE_LABELS[type]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{CONTACT_TYPE_LABELS.employee}</SelectItem>
                  <SelectItem value="vendor">{CONTACT_TYPE_LABELS.vendor}</SelectItem>
                  <SelectItem value="investor">{CONTACT_TYPE_LABELS.investor}</SelectItem>
                  <SelectItem value="cofounder">{CONTACT_TYPE_LABELS.cofounder}</SelectItem>
                  <SelectItem value="partner">{CONTACT_TYPE_LABELS.partner}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <EntityImageField
            label="Profile photo"
            name={name || contact?.name || "Contact"}
            imageUrl={displayedImageUrl}
            shape="circle"
            fileName={selectedFile?.name ?? null}
            status={mediaStatus}
            error={mediaError}
            canRemove={canRemoveImage}
            disabled={saving}
            onFileSelect={handleFileSelect}
            onRemove={handleRemoveImage}
            fallback={
              <div
                className="flex h-full w-full items-center justify-center rounded-full text-sm font-extrabold"
                style={{
                  background: "linear-gradient(145deg, #dcfce7, #bbf7d0)",
                  color: "#15803d",
                }}
              >
                {getInitials(name || contact?.name || "Contact")}
              </div>
            }
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Role / Title</label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lead Developer" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">About</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief description — what they do, their context..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0000" />
            </div>
          </div>

          {/* Companies */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Companies</label>
            {loadingRelations ? (
              <p className="text-xs text-muted-foreground px-1">Loading...</p>
            ) : allCompanies.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">No companies yet — add one first.</p>
            ) : (
              <div className="max-h-32 overflow-y-auto rounded-lg border p-2 flex flex-col gap-1">
                {allCompanies.map((company) => (
                  <label key={company.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted text-sm">
                    <input
                      type="checkbox"
                      checked={companyIds.includes(company.id)}
                      onChange={() => setCompanyIds(toggleId(companyIds, company.id))}
                      className="accent-indigo-500 h-3.5 w-3.5 shrink-0"
                    />
                    <span className="flex-1">{company.name}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: company.is_owned ? "#dbeafe" : "#ccfbf1",
                        color: company.is_owned ? "#1d4ed8" : "#0f766e",
                      }}
                    >
                      {company.is_owned ? "Owned" : "Partner"}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Projects</label>
            {loadingRelations ? (
              <p className="text-xs text-muted-foreground px-1">Loading...</p>
            ) : allProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">No projects yet — add one first.</p>
            ) : (
              <div className="max-h-28 overflow-y-auto rounded-lg border p-2 flex flex-col gap-1">
                {allProjects.map((project) => (
                  <label key={project.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted text-sm">
                    <input
                      type="checkbox"
                      checked={projectIds.includes(project.id)}
                      onChange={() => setProjectIds(toggleId(projectIds, project.id))}
                      className="accent-indigo-500 h-3.5 w-3.5 shrink-0"
                    />
                    <span className="flex-1">{project.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {successFlash && (
            <p className="text-sm font-medium text-green-600 text-center w-full">
              {successFlash}
            </p>
          )}
          {!contact && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="accent-indigo-500 h-3.5 w-3.5"
              />
              Add another contact
            </label>
          )}
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : contact ? "Save Changes" : "Add Contact"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
