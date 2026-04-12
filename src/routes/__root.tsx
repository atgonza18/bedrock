import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });

  return (
    <TooltipProvider>
      {isLoading && <div className="route-loading-bar" />}
      <Outlet />
      <Toaster richColors closeButton />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </TooltipProvider>
  );
}
