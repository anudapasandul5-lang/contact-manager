import { Header } from "@/components/shared/Header";
import { ContactsGrid } from "@/components/contacts/ContactsGrid";
import { redirectIfUnauthenticated } from "@/lib/auth/server-guards";

export default async function ContactsPage() {
  await redirectIfUnauthenticated();

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: "var(--clay-bg)", transition: "background 0.3s ease" }}>
        <ContactsGrid />
      </main>
    </div>
  );
}
