import { DashboardShell } from "@/features/shared/components/DashboardShell";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return <DashboardShell userRole={session?.user?.role}>{children}</DashboardShell>;
}
