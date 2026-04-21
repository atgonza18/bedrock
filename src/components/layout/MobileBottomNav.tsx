import { Link, useRouterState } from "@tanstack/react-router";
import { FolderKanban, ClipboardList, Inbox, Plus, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { haptics } from "@/lib/haptics";

/**
 * Mobile-only bottom nav for non-admin users. Admins keep the full
 * sidebar (they have 8+ admin pages that don't fit here). Clients are
 * excluded — they have their own portal layout.
 *
 * Layout: four icon-labeled tabs, with a raised primary FAB pinned to
 * the left tab cluster. Hidden when viewport ≥ md (desktop sidebar
 * takes over). Respects safe-area-inset-bottom.
 */
export function MobileBottomNav() {
  const me = useCurrentMember();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  if (me?.state !== "ok") return null;
  const role = me.membership.role;
  if (role === "client" || role === "admin") return null;

  const isPm = role === "pm";

  const tabs: Array<{
    label: string;
    to: string;
    icon: React.ComponentType<{ className?: string }>;
    match: (p: string) => boolean;
  }> = [
    {
      label: "Projects",
      to: "/app/projects",
      icon: FolderKanban,
      match: (p) => p.startsWith("/app/projects"),
    },
    {
      label: "Reports",
      to: "/app/reports",
      icon: ClipboardList,
      match: (p) => p === "/app/reports" || p.startsWith("/app/reports/"),
    },
    ...(isPm
      ? [
          {
            label: "Queue",
            to: "/app/queue",
            icon: Inbox,
            match: (p: string) => p.startsWith("/app/queue"),
          },
        ]
      : [
          {
            label: "Daily log",
            to: "/app/daily-log",
            icon: Calendar,
            match: (p: string) => p.startsWith("/app/daily-log"),
          },
        ]),
  ];

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="relative grid grid-cols-4 h-14">
        {tabs.slice(0, 2).map((t) => (
          <NavTab key={t.to} tab={t} active={t.match(pathname)} />
        ))}
        {/* Center FAB slot */}
        <div className="relative flex items-center justify-center">
          <Link
            to="/app/projects"
            onClick={() => haptics.tap()}
            className="absolute -top-4 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
            aria-label="Start new report"
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </Link>
          <span className="text-[10px] font-medium text-muted-foreground pt-6">
            New
          </span>
        </div>
        {tabs.slice(2).map((t) => (
          <NavTab key={t.to} tab={t} active={t.match(pathname)} />
        ))}
      </div>
    </nav>
  );
}

function NavTab({
  tab,
  active,
}: {
  tab: {
    label: string;
    to: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link
      to={tab.to}
      onClick={() => haptics.tap()}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <Icon
        className={cn("size-5", active && "text-foreground")}
      />
      <span>{tab.label}</span>
    </Link>
  );
}
