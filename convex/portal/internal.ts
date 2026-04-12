import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * Looks up a client contact by ID. Used by the deliver action to
 * retrieve email and name for report delivery emails.
 */
export const getContact = internalQuery({
  args: { contactId: v.id("clientContacts") },
  handler: async (ctx, { contactId }) => {
    return await ctx.db.get("clientContacts", contactId);
  },
});
