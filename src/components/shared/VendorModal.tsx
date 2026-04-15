"use client";

import { useEffect, useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import type { Company, Project, VendorWithRelations } from "@/lib/supabase/types";

interface DraftVendorPerson {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  bio: string;
}

interface VendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: VendorWithRelations;
  onSaved: () => void;
}

const PRESET_COLORS = ["#f97316", "#ea580c", "#fb923c", "#fdba74", "#c2410c", "#f59e0b"];

export function VendorModal({ open, onOpenChange, vendor, onSaved }: VendorModalProps) {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [people, setPeople] = useState<DraftVendorPerson[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    Promise.all([
      fetch("/api/companies").then((response) => response.json()),
      fetch("/api/projects").then((response) => response.json()),
    ])
      .then(([companyData, projectData]) => {
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setProjects(Array.isArray(projectData) ? projectData : []);
      })
      .catch(() => {
        setCompanies([]);
        setProjects([]);
      });
  }, [open]);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setSpecialty(vendor.specialty || "");
      setNotes(vendor.notes || "");
      setColor(vendor.color || PRESET_COLORS[0]);
      setCompanyIds((vendor.vendor_companies ?? []).map(({ companies }) => companies.id));
      setProjectIds((vendor.vendor_projects ?? []).map(({ projects }) => projects.id));
      setPeople(
        (vendor.vendor_people ?? []).map((person) => ({
          id: person.id,
          name: person.name,
          role: person.role || "",
          email: person.email || "",
          phone: person.phone || "",
          bio: person.bio || "",
        })),
      );
    } else {
      setName("");
      setSpecialty("");
      setNotes("");
      setColor(PRESET_COLORS[0]);
      setCompanyIds([]);
      setProjectIds([]);
      setPeople([]);
    }

    setError(null);
    setConfirmDelete(false);
  }, [vendor, open]);

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
  }

  function addPerson() {
    setPeople((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        role: "",
        email: "",
        phone: "",
        bio: "",
      },
    ]);
  }

  function updatePerson(id: string, field: keyof DraftVendorPerson, value: string) {
    setPeople((current) => current.map((person) => (person.id === id ? { ...person, [field]: value } : person)));
  }

  function removePerson(id: string) {
    setPeople((current) => current.filter((person) => person.id !== id));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    if (people.some((person) => !person.name.trim())) {
      setError("Each vendor person needs a name.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = vendor ? `/api/vendors/${vendor.id}` : "/api/vendors";
      const method = vendor ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          specialty: specialty.trim() || null,
          notes: notes.trim() || null,
          color,
          companyIds,
          projectIds,
          people: people.map((person) => ({
            id: vendor ? person.id : null,
            name: person.name.trim(),
            role: person.role.trim() || null,
            email: person.email.trim() || null,
            phone: person.phone.trim() || null,
            bio: person.bio.trim() || null,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error || "Failed to save vendor.");
        return;
      }

      window.dispatchEvent(new CustomEvent("contact-manager:data-changed"));
      onSaved();
      onOpenChange(false);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!vendor) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error || "Failed to delete vendor.");
        return;
      }

      window.dispatchEvent(new CustomEvent("contact-manager:data-changed"));
      onSaved();
      onOpenChange(false);
    } catch {
      setError("Network error.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Vendor Name *</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Acme Printing" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Specialty</label>
              <Input value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="e.g. Printing, Logistics" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Important context about this vendor" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  className="h-8 w-8 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: swatch,
                    borderColor: color === swatch ? "#0f172a" : "transparent",
                    transform: color === swatch ? "scale(1.08)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {companies.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Connected Businesses</label>
              <div className="max-h-32 overflow-y-auto rounded-lg border p-2 flex flex-col gap-1">
                {companies.map((company) => (
                  <label key={company.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted text-sm">
                    <input
                      type="checkbox"
                      checked={companyIds.includes(company.id)}
                      onChange={() => setCompanyIds(toggleId(companyIds, company.id))}
                      className="accent-orange-500 h-3.5 w-3.5 shrink-0"
                    />
                    <span className="flex-1">{company.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Connected Side Projects</label>
              <div className="max-h-32 overflow-y-auto rounded-lg border p-2 flex flex-col gap-1">
                {projects.map((project) => (
                  <label key={project.id} className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted text-sm">
                    <input
                      type="checkbox"
                      checked={projectIds.includes(project.id)}
                      onChange={() => setProjectIds(toggleId(projectIds, project.id))}
                      className="accent-orange-500 h-3.5 w-3.5 shrink-0"
                    />
                    <span className="flex-1">{project.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Vendor People</label>
              <Button type="button" variant="outline" size="sm" onClick={addPerson}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Vendor Person
              </Button>
            </div>

            {people.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                No vendor people added yet.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {people.map((person) => (
                  <div key={person.id} className="rounded-lg border p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">Vendor person</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => removePerson(person.id)}>
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Name *</label>
                        <Input value={person.name} onChange={(event) => updatePerson(person.id, "name", event.target.value)} placeholder="Full name" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Role</label>
                        <Input value={person.role} onChange={(event) => updatePerson(person.id, "role", event.target.value)} placeholder="e.g. Account manager" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Email</label>
                        <Input value={person.email} onChange={(event) => updatePerson(person.id, "email", event.target.value)} placeholder="email@example.com" type="email" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Phone</label>
                        <Input value={person.phone} onChange={(event) => updatePerson(person.id, "phone", event.target.value)} placeholder="+1 555 0000" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Bio</label>
                      <Textarea value={person.bio} onChange={(event) => updatePerson(person.id, "bio", event.target.value)} rows={2} placeholder="Notes about this vendor person" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          {vendor && (
            confirmDelete ? (
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-sm text-red-500">Delete this vendor?</span>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Yes, delete"}
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
            {saving ? "Saving..." : vendor ? "Save Changes" : "Add Vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
