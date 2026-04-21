import { ReactNode, useEffect, useState } from "react";
import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  CalendarDays,
  ClipboardCheck,
  Shield,
  Users,
  Building2,
  FolderCog,
  Layers,
  FlaskConical,
  Wrench,
  Award,
  Settings,
  LogOut,
  ChevronsUpDown,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  Monitor,
  UserRound,
  HelpCircle,
  HardHat,
  ClipboardList,
  ActivitySquare,
} from "lucide-react";
import { permits } from "@/lib/permissions";
import { useTheme } from "next-themes";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbProvider, useBreadcrumbContext } from "./breadcrumb-context";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogEyebrow,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConnectionBanner } from "./ConnectionBanner";
import { BedrockLogo } from "@/components/logo";
import { CommandPalette } from "@/components/command-palette";
import { InstallPrompt } from "@/components/InstallPrompt";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          {/* Bottom padding on mobile so content clears the bottom nav. */}
          <div className="flex-1 pb-16 md:pb-0">{children}</div>
        </SidebarInset>
        <GlobalShortcuts />
        <CommandPalette />
        <ConnectionBanner />
        <InstallPrompt />
        <MobileBottomNav />
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}

// ─── Global keyboard shortcuts ──────────────────────────────────────────────
// Linear-style: press G then a letter to navigate. Press ? for help.

function GlobalShortcuts() {
  const router = useRouter();
  const me = useCurrentMember();
  const [showHelp, setShowHelp] = useState(false);

  const isAdmin = me?.state === "ok" && me.membership.role === "admin";
  const isPmOrAdmin =
    me?.state === "ok" &&
    (me.membership.role === "pm" || me.membership.role === "admin");

  useEffect(() => {
    let leaderTimer: ReturnType<typeof setTimeout> | null = null;
    let leaderActive = false;

    const isEditable = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      if (leaderActive) {
        leaderActive = false;
        if (leaderTimer) clearTimeout(leaderTimer);
        const k = e.key.toLowerCase();
        let to: string | null = null;
        if (k === "d") to = "/app";
        else if (k === "p") to = "/app/projects";
        else if (k === "r") to = "/app/reports";
        else if (k === "q" && isPmOrAdmin) to = "/app/queue";
        else if (k === "a" && isAdmin) to = "/app/admin/users";
        if (to) {
          e.preventDefault();
          void router.navigate({ to });
        }
        return;
      }

      if (e.key === "g" || e.key === "G") {
        leaderActive = true;
        leaderTimer = setTimeout(() => {
          leaderActive = false;
        }, 1_200);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (leaderTimer) clearTimeout(leaderTimer);
    };
  }, [router, isAdmin, isPmOrAdmin]);

  return <ShortcutsDialog open={showHelp} onOpenChange={setShowHelp} isPmOrAdmin={isPmOrAdmin} isAdmin={isAdmin} />;
}

function ShortcutsDialog({
  open,
  onOpenChange,
  isPmOrAdmin,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isPmOrAdmin: boolean;
  isAdmin: boolean;
}) {
  const navItems = [
    { keys: ["G", "D"], label: "Go to dashboard" },
    { keys: ["G", "P"], label: "Go to projects" },
    { keys: ["G", "R"], label: "Go to my reports" },
    ...(isPmOrAdmin ? [{ keys: ["G", "Q"], label: "Go to review queue" }] : []),
    ...(isAdmin ? [{ keys: ["G", "A"], label: "Go to admin" }] : []),
  ];
  const actions = [
    { keys: ["⌘", "K"], label: "Open command palette" },
    ...(isPmOrAdmin ? [{ keys: ["C"], label: "Claim next submitted report (on review queue)" }] : []),
    { keys: ["?"], label: "Toggle this help" },
    { keys: ["B"], label: "Toggle sidebar" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>Keyboard shortcuts</DialogEyebrow>
          <DialogTitle>Navigate faster</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <ShortcutGroup title="Navigation" items={navItems} />
          <ShortcutGroup title="Actions" items={actions} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutGroup({
  title,
  items,
}: {
  title: string;
  items: { keys: string[]; label: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
        {title}
      </p>
      <div className="divide-y">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <span className="text-sm">{item.label}</span>
            <span className="flex items-center gap-1">
              {item.keys.map((k, j) => (
                <kbd
                  key={j}
                  className="font-mono text-[11px] border rounded px-1.5 py-0.5 bg-muted/50"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function AppSidebar() {
  const me = useCurrentMember();
  const isAdmin = me?.state === "ok" && me.membership.role === "admin";
  const isClientRole = me?.state === "ok" && me.membership.role === "client";
  const canSeeAllocation = me?.state === "ok" && permits(me, "canViewAllocation");
  const canReviewQueue = me?.state === "ok" && permits(me, "canApproveReports");
  const canManageTemplates =
    me?.state === "ok" && permits(me, "canManageTestTemplates");

  // Only run queries when user is fully onboarded (state === "ok").
  // Without this guard, queries fire before the profile exists and throw NO_PROFILE.
  const isReady = me?.state === "ok";

  // Queue count for the badge — gated on approve permission, not just role.
  const queue = useQuery(
    api.reports.queries.listReviewQueue,
    isReady && canReviewQueue ? {} : "skip",
  );
  const queueCount = Array.isArray(queue) ? queue.length : 0;

  // Get rejected count for "My Reports" badge (internal users only)
  const myDrafts = useQuery(
    api.reports.queries.listMyDrafts,
    isReady && !isClientRole ? {} : "skip",
  );
  const rejectedCount = Array.isArray(myDrafts)
    ? myDrafts.filter((r) => r.status === "rejected").length
    : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-auto py-3" tooltip="Bedrock">
              <Link to="/app" className="flex items-center gap-2">
                <BedrockLogo
                  variant="light"
                  size="md"
                  className="group-data-[collapsible=icon]:[&>span:last-child]:hidden"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isClientRole ? (
          /* Client navigation — simplified */
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem to="/app/client" icon={FileText} label="Your Reports" exact />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          /* Internal navigation */
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <NavItem to="/app" icon={LayoutDashboard} label="Dashboard" exact />
                  <NavItem to="/app/projects" icon={FolderKanban} label="Projects" />
                  <NavItem
                    to="/app/reports"
                    icon={FileText}
                    label="My Reports"
                    badge={rejectedCount > 0 ? rejectedCount : undefined}
                  />
                  <NavItem to="/app/daily-log" icon={CalendarDays} label="Daily Log" />
                  <NavItem to="/app/lab" icon={FlaskConical} label="Lab" />
                  {canReviewQueue && (
                    <NavItem
                      to="/app/queue"
                      icon={ClipboardCheck}
                      label="Review Queue"
                      badge={queueCount > 0 ? queueCount : undefined}
                    />
                  )}
                  {canSeeAllocation && (
                    <NavItem
                      to="/app/allocation"
                      icon={HardHat}
                      label="Allocation"
                    />
                  )}
                  {canManageTemplates && (
                    <NavItem
                      to="/app/templates"
                      icon={ClipboardList}
                      label="Templates"
                    />
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>
                    <Shield className="size-3 mr-1" />
                    Admin
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <NavItem to="/app/admin/users" icon={Users} label="Users" />
                      <NavItem to="/app/admin/clients" icon={Building2} label="Clients" />
                      <NavItem to="/app/admin/projects" icon={FolderCog} label="Projects" />
                      <NavItem to="/app/admin/proctors" icon={Layers} label="Proctors" />
                      <NavItem to="/app/admin/equipment" icon={Wrench} label="Equipment" />
                      <NavItem to="/app/admin/certifications" icon={Award} label="Certifications" />
                      <NavItem to="/app/admin/audit" icon={ActivitySquare} label="Audit log" />
                      <NavItem to="/app/admin/settings" icon={Settings} label="Settings" />
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <CollapseToggle />
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

function CollapseToggle() {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={toggleSidebar}
          tooltip="Toggle sidebar"
          className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
        >
          {isCollapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <ChevronsLeft className="size-4" />
          )}
          <span>{isCollapsed ? "Expand" : "Collapse"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  badge,
  exact,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  exact?: boolean;
}) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile, isMobile } = useSidebar();
  const isActive = exact
    ? currentPath === to || currentPath === to + "/"
    : currentPath.startsWith(to);

  return (
    <SidebarMenuItem>
      {/* Active left-border accent — sits outside the button so the item hover doesn't animate it */}
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-sm bg-sidebar-primary"
        />
      )}
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to} onClick={() => { if (isMobile) setOpenMobile(false); }}>
          <Icon className="size-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {badge !== undefined && (
        <SidebarMenuBadge>{badge}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}

function UserMenu() {
  const me = useCurrentMember();
  const { signOut } = useAuthActions();
  const { theme, setTheme } = useTheme();

  const name =
    me?.state === "ok"
      ? me.profile.fullName
      : me?.state === "no_org"
        ? me.profile.fullName
        : "User";
  const role = me?.state === "ok" ? me.membership.role : null;
  const org = me?.state === "ok" ? me.org.displayName : null;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentThemeLabel =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";
  const CurrentThemeIcon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {org ?? "No organization"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{name}</span>
                {role && (
                  <Badge variant="outline" className="w-fit text-[10px] mt-0.5">
                    {role}
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/profile">
                <UserRound className="size-4" />
                <span>Your profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/app/help">
                <HelpCircle className="size-4" />
                <span>Help &amp; shortcuts</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CurrentThemeIcon className="size-4" />
                <span>Theme</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {currentThemeLabel}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="size-4" />
                    <span>Light</span>
                    {theme === "light" && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="size-4" />
                    <span>Dark</span>
                    {theme === "dark" && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="size-4" />
                    <span>System</span>
                    {theme === "system" && (
                      <span className="ml-auto text-xs text-muted-foreground">✓</span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function AppHeader() {
  const { crumbs } = useBreadcrumbContext();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex items-center gap-2">
        {/* Mobile only — opens the sidebar drawer */}
        <SidebarTrigger className="-ml-1 md:hidden" />
        {crumbs.length > 0 && (
          <>
            <Separator orientation="vertical" className="mr-2 !h-4 md:hidden" />
            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.map((crumb, i) => {
                  const isLast = i === crumbs.length - 1;
                  return (
                    <span key={i} className="contents">
                      {i > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast || !crumb.href ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={crumb.href}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </span>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </>
        )}
      </div>
    </header>
  );
}
