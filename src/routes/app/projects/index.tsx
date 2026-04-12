import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { FolderKanban, MapPin } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";

export const Route = createFileRoute("/app/projects/")({
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const projects = useQuery(api.projects.list);

  useSetBreadcrumbs([{ label: "Projects" }]);

  return (
    <PageTransition>
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Active jobs you&rsquo;re assigned to.
        </p>
      </div>

      {projects === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-12 rounded-full bg-amber-brand/10 flex items-center justify-center mb-4">
              <FolderKanban className="size-6 text-amber-brand" />
            </div>
            <h3 className="font-heading font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Projects are created by admins in the Admin panel. Once assigned, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p._id}
              to="/app/projects/$projectId"
              params={{ projectId: p._id }}
            >
              <Card className="hover:shadow-md transition-shadow duration-150 h-full group">
                <CardContent className="py-4 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-2">
                    <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-amber-brand/10 transition-colors">
                      <FolderKanban className="size-4 text-muted-foreground group-hover:text-amber-brand transition-colors" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {p.status}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mt-1 line-clamp-2">
                    {p.name}
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {p.jobNumber}
                  </p>
                  {(p.city || p.state) && (
                    <p className="text-xs text-muted-foreground mt-auto pt-3 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[p.city, p.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
