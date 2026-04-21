"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, User, Building2, FolderKanban, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContactModal } from "./ContactModal";
import { CompanyModal } from "./CompanyModal";
import { ProjectModal } from "./ProjectModal";
import { VendorModal } from "./VendorModal";

const MENU_ITEMS = [
  { label: "Add Contact", icon: User, action: "contact" as const, color: "#4ade80", glow: "rgba(34,197,94,0.3)" },
  { label: "Add Company", icon: Building2, action: "company" as const, color: "#93c5fd", glow: "rgba(59,130,246,0.3)" },
  { label: "Add Vendor", icon: Truck, action: "vendor" as const, color: "#fdba74", glow: "rgba(249,115,22,0.3)" },
  { label: "Add Project", icon: FolderKanban, action: "project" as const, color: "#c4b5fd", glow: "rgba(182,160,255,0.3)" },
];

export function FloatingAddButton() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function openModal(modal: "contact" | "company" | "vendor" | "project") {
    setMenuOpen(false);
    if (modal === "contact") setContactOpen(true);
    if (modal === "company") setCompanyOpen(true);
    if (modal === "vendor") setVendorOpen(true);
    if (modal === "project") setProjectOpen(true);
  }

  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      <div ref={menuRef} className="floating-add-root fixed bottom-4 right-14 z-50 flex flex-col items-end gap-2">
        {/* Menu items */}
        <div className={cn(
          "flex flex-col items-end gap-2 mb-1 transition-all duration-200",
          menuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}>
          {MENU_ITEMS.map(({ label, icon: Icon, action, color, glow }, i) => (
            <button
              key={action}
              onClick={() => openModal(action)}
              style={{
                transitionDelay: menuOpen ? `${i * 40}ms` : "0ms",
                background: "rgba(22,26,33,0.95)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 12px ${glow}`,
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5",
                menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
              )}
            >
              <Icon className="h-4 w-4" style={{ color }} />
              {label}
            </button>
          ))}
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-white transition-all duration-300",
            menuOpen ? "rotate-45" : ""
          )}
          style={{
            background: "linear-gradient(135deg, #7c3aed, #0e7490)",
            boxShadow: menuOpen
              ? "0 0 30px rgba(182,160,255,0.5), 0 0 60px rgba(0,227,253,0.2), 0 8px 24px rgba(0,0,0,0.4)"
              : "0 0 20px rgba(182,160,255,0.3), 0 8px 24px rgba(0,0,0,0.4)",
          }}
          aria-label="Add new item"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} onSaved={() => {}} />
      <CompanyModal open={companyOpen} onOpenChange={setCompanyOpen} onSaved={() => {}} />
      <VendorModal open={vendorOpen} onOpenChange={setVendorOpen} onSaved={() => {}} />
      <ProjectModal open={projectOpen} onOpenChange={setProjectOpen} onSaved={() => {}} />
    </>
  );
}
