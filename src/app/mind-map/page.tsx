import { HeaderWithProfile } from "@/components/shared/HeaderWithProfile";
import { MindMapCanvas } from "@/components/mind-map/MindMapCanvas";
import { redirectIfUnauthenticated } from "@/lib/auth/server-guards";

export default async function MindMapPage() {
  await redirectIfUnauthenticated();

  return (
    <div className="flex h-screen flex-col">
      <HeaderWithProfile />
      <main className="flex-1" style={{ background: "#f5f0eb", position: "relative" }}>
        <MindMapCanvas />
      </main>
    </div>
  );
}
