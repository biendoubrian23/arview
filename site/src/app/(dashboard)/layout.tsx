import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar — à construire dans components/dashboard/Sidebar.tsx */}
      <aside className="w-60 shrink-0" />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
