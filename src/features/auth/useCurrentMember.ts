import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Hook around `api.users.me`. Returns the discriminated MeResult, or
 * `undefined` while the query is in flight. Use the `state` field to
 * branch in the UI.
 */
export function useCurrentMember() {
  return useQuery(api.users.me);
}
