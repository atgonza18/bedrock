import { Navigate, Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { Users, Building2, FolderCog, Layers, Wrench, Award, Settings } from "lucide-react";

export const Route = createFileRoute("/app/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const me = useCurrentMember();

  useSetBreadcrumbs([{ label: "Admin" }]);

  if (me === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (me.state !== "ok" || me.membership.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization&rsquo;s settings.
        </p>
      </div>
      <nav className="flex gap-1 border-b">
        <Link
          to="/app/admin/users"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors data-[status=active]:border-amber-brand data-[status=active]:text-foreground"
          activeProps={{ "data-status": "active" } as any}
        >
          <Users className="h-3.5 w-3.5" />
          Users
        </Link>
        <Link
          to="/app/admin/clients"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors data-[status=active]:border-amber-brand data-[status=active]:text-foreground"
          activeProps={{ "data-status": "active" } as any}
        >
          <Building2 className="h-3.5 w-3.5" />
          Clients
        </Link>
        <Link
          to="/app/admin/projects"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors data-[status=active]:border-amber-brand data-[status=active]:text-foreground"
          activeProps={{ "data-status": "active" } as any}
        >
          <FolderCog className="h-3.5 w-3.5" />
          Projects
        </Link>
        <Link
          to="/app/admin/proctors"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors data-[status=active]:border-amber-brand data-[status=active]:text-foreground"
          activeProps={{ "data-status": "active" } as any}
        >
          <Layers className="h-3.5 w-3.5" />
          Proctors
        </Link>
        <Link
          to="/app/admin/equipment"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors data-[status=active]:border-amber-brand data-[status=active]:text-foreground"
          activeProps={{ "data-status": "active" } as any}
        >
          <Wrench className="h-3.5 w-3.5" />
          Equipment
        </Link>
        <Link
          to="/app/admin/certifications"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors data-[status=active]:border-amber-brand data-[status=active]:text-foreground"
          activeProps={{ "data-status": "active" } as any}
        >
          <Award className="h-3.5 w-3.5" />
          Certifications
        </Link>
        <Link
          to="/app/admin/settings"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-px transition-colors data-[status=active]:border-amber-brand data-[status=active]:text-foreground"
          activeProps={{ "data-status": "active" } as any}
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </nav>
      <Outlet />
    </div>
  );
}
