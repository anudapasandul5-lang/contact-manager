import type { ContactWithRelations, VendorWithRelations } from "@/lib/supabase/types";

export type DirectoryFilter = "all" | "employee" | "vendor";

export type DirectoryItem =
  | {
      key: string;
      kind: "contact";
      name: string;
      searchText: string;
      contact: ContactWithRelations;
    }
  | {
      key: string;
      kind: "vendor";
      name: string;
      searchText: string;
      vendor: VendorWithRelations;
    };

function joinSearchParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim().toLowerCase())
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export function buildDirectoryItems(
  contacts: ContactWithRelations[],
  vendors: VendorWithRelations[],
): DirectoryItem[] {
  const contactItems: DirectoryItem[] = contacts.map((contact) => {
    const companyNames = (contact.contact_companies ?? []).map((cc) => cc.companies.name);

    return {
      key: `contact:${contact.id}`,
      kind: "contact",
      name: contact.name,
      searchText: joinSearchParts([
        contact.name,
        contact.email,
        contact.role,
        contact.bio,
        ...companyNames,
      ]),
      contact,
    };
  });

  const vendorItems: DirectoryItem[] = vendors.map((vendor) => {
    const companyNames = (vendor.vendor_companies ?? []).map((vc) => vc.companies.name);
    const peopleTerms = (vendor.vendor_people ?? []).flatMap((person) => [
      person.name,
      person.role,
      person.email,
      person.phone,
      person.bio,
    ]);

    return {
      key: `vendor:${vendor.id}`,
      kind: "vendor",
      name: vendor.name,
      searchText: joinSearchParts([
        vendor.name,
        vendor.specialty,
        vendor.notes,
        ...companyNames,
        ...peopleTerms,
      ]),
      vendor,
    };
  });

  return [...contactItems, ...vendorItems].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterDirectoryItems(items: DirectoryItem[], filter: DirectoryFilter, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  return items.filter((item) => {
    if (filter === "employee" && !(item.kind === "contact" && item.contact.type === "employee")) {
      return false;
    }

    if (filter === "vendor" && !(
      (item.kind === "contact" && item.contact.type === "vendor")
      || item.kind === "vendor"
    )) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return item.searchText.includes(normalizedSearch);
  });
}

export function buildDirectoryStats(items: DirectoryItem[]) {
  return {
    total: items.length,
    employees: items.filter((item) => item.kind === "contact" && item.contact.type === "employee").length,
    vendors: items.filter((item) => (item.kind === "contact" && item.contact.type === "vendor") || item.kind === "vendor").length,
  };
}
