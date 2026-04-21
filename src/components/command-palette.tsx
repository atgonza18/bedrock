import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { TestKindIcon } from "@/components/test-icons";
import { reportKindLabel } from "@/lib/constants";
import { kindColor } from "@/lib/test-kind-colors";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ClipboardCheck,
  Shield,
  Plus,
  Sun,
  Moon,
  Monitor,
  LogOut,
} from "lucide-react";

/**
 * Global Cmd+K / Ctrl+K command palette.
 * Opens from anywhere in the authenticated app.
 * Search across projects, recent reports, navigation, and actions.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const me = useCurrentMember();
  const { setTheme } = useTheme();
  const { signOut } = useAuthActions();

  const isReady = me?.state === "ok";
  const isAdmin = isReady && me.membership.role === "admin";
  const isPmOrAdmin = isReady && (me.membership.role === "pm" || me.membership.role === "admin");
  const isClient = isReady && me.membership.role === "client";

  // Queries — only run when palette is open AND user is ready.
  // Keeps idle listeners to a minimum.
  const projects = useQuery(
    api.projects.list,
    open && isReady && !isClient ? {} : "skip",
  );
  const myReports = useQuery(
    api.reports.queries.listMyReports,
    open && isReady && !isClient ? {} : "skip",
  );

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    // Let the dialog close before triggering; prevents focus jank.
    setTimeout(action, 40);
  };

  if (!isReady) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, reports, actions…" />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem
            value="dashboard go to dashboard"
            onSelect={() => run(() => void navigate({ to: "/app" }))}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          {!isClient && (
            <>
              <CommandItem
                value="projects go to projects"
                onSelect={() => run(() => void navigate({ to: "/app/projects" }))}
              >
                <FolderKanban />
                <span>Projects</span>
                <CommandShortcut>G P</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="reports my go to my reports"
                onSelect={() => run(() => void navigate({ to: "/app/reports" }))}
              >
                <FileText />
                <span>My reports</span>
                <CommandShortcut>G R</CommandShortcut>
              </CommandItem>
            </>
          )}
          {isPmOrAdmin && (
            <CommandItem
              value="queue review queue"
              onSelect={() => run(() => void navigate({ to: "/app/queue" }))}
            >
              <ClipboardCheck />
              <span>Review queue</span>
              <CommandShortcut>G Q</CommandShortcut>
            </CommandItem>
          )}
          {isAdmin && (
            <CommandItem
              value="admin users"
              onSelect={() => run(() => void navigate({ to: "/app/admin/users" }))}
            >
              <Shield />
              <span>Admin</span>
              <CommandShortcut>G A</CommandShortcut>
            </CommandItem>
          )}
        </CommandGroup>

        {/* Projects */}
        {projects && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.slice(0, 20).map((p) => (
                <CommandItem
                  key={p._id}
                  value={`project ${p.name} ${p.jobNumber ?? ""} ${p.city ?? ""}`}
                  onSelect={() =>
                    run(() =>
                      void navigate({
                        to: "/app/projects/$projectId",
                        params: { projectId: p._id },
                      }),
                    )
                  }
                >
                  <FolderKanban className="text-muted-foreground" />
                  <span>{p.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p.jobNumber}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Recent reports */}
        {myReports && myReports.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent reports">
              {myReports.slice(0, 10).map((r) => {
                const c = kindColor(r.kind);
                return (
                  <CommandItem
                    key={r._id}
                    value={`report ${r.number} ${r.projectName} ${reportKindLabel(r.kind, r.templateName)} ${r.status}`}
                    onSelect={() =>
                      run(() =>
                        void navigate({
                          to: "/app/reports/$reportId",
                          params: { reportId: r._id },
                        }),
                      )
                    }
                  >
                    <TestKindIcon
                      kind={r.kind}
                      width={16}
                      height={16}
                      style={{ color: c.oklch }}
                    />
                    <span className="font-mono text-[13px]">{r.number}</span>
                    <span className="text-muted-foreground">
                      {r.projectName}
                    </span>
                    <CommandShortcut className="capitalize">
                      {r.status.replace(/_/g, " ")}
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* Actions */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {!isClient && projects && projects.length > 0 && (
            <CommandItem
              value="new report concrete field test"
              onSelect={() =>
                run(() =>
                  void navigate({
                    to: "/app/reports/new/$kind",
                    params: { kind: "concrete_field" },
                    search: { projectId: projects[0]._id },
                  }),
                )
              }
            >
              <Plus />
              <span>New concrete field report</span>
              <span className="ml-auto text-xs text-muted-foreground">
                in {projects[0].name}
              </span>
            </CommandItem>
          )}
          <CommandItem
            value="theme light"
            onSelect={() => run(() => setTheme("light"))}
          >
            <Sun />
            <span>Switch to light theme</span>
          </CommandItem>
          <CommandItem
            value="theme dark"
            onSelect={() => run(() => setTheme("dark"))}
          >
            <Moon />
            <span>Switch to dark theme</span>
          </CommandItem>
          <CommandItem
            value="theme system"
            onSelect={() => run(() => setTheme("system"))}
          >
            <Monitor />
            <span>Use system theme</span>
          </CommandItem>
          <CommandItem
            value="sign out log out"
            onSelect={() => run(() => void signOut())}
          >
            <LogOut />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
