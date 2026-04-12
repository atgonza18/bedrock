import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // The router doesn't render any data via its loaders in M1; Convex
  // queries handle data through React. Loaders will get a Convex client
  // injected via context in M2 if needed.
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
