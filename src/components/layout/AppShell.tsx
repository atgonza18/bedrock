import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbProvider, useBreadcrumbContext } from "./breadcrumb-context";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <BreadcrumbProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex-1">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </BreadcrumbProvider>
  );
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

function AppSidebar() {
  const me = useCurrentMember();
  const isAdmin = me?.state === "ok" && me.membership.role === "admin";
  const isPmOrAdmin =
    me?.state === "ok" &&
    (me.membership.role === "pm" || me.membership.role === "admin");
  const isClientRole = me?.state === "ok" && me.membership.role === "client";

  // Only run queries when user is fully onboarded (state === "ok").
  // Without this guard, queries fire before the profile exists and throw NO_PROFILE.
  const isReady = me?.state === "ok";

  // Get queue count for badge (pm/admin only)
  const queue = useQuery(
    api.reports.queries.listReviewQueue,
    isReady && isPmOrAdmin ? {} : "skip",
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
            <SidebarMenuButton size="lg" asChild className="h-auto py-3">
              <Link to="/app">
                <img
                  src="/bedrock-logo.png"
                  srcSet="/bedrock-logo.png 1x, /bedrock-logo@2x.png 2x"
                  alt="Bedrock"
                  className="h-5 w-auto"
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
                  {isPmOrAdmin && (
                    <NavItem
                      to="/app/queue"
                      icon={ClipboardCheck}
                      label="Review Queue"
                      badge={queueCount > 0 ? queueCount : undefined}
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
  const isActive = exact
    ? currentPath === to || currentPath === to + "/"
    : currentPath.startsWith(to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link to={to}>
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
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="size-4 mr-2" />
              Sign out
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
