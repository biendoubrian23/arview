import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import DashboardShell from "./_components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <DashboardShell
      user={{ id: user.id, email: user.email ?? "" }}
      profile={profile}
    >
      {children}
    </DashboardShell>
  );
}
