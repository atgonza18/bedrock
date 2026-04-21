import { v, ConvexError } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { requireMember, requireRole, requirePermission, requireProjectAccess, permits, orgScoped } from "./lib/auth";
import { projectStatus, projectAssignmentRole } from "./schema";

// ---------- Queries ----------

/** List all active projects in the user's org. Admin sees all; others see assigned. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const member = await requireMember(ctx);
    const { org, membership, userId } = member;

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "active"),
      )
      .take(200);

    if (permits(member, "canViewAllProjects")) {
      return projects;
    }

    // Client users see projects belonging to their client company.
    if (membership.role === "client" && membership.clientId) {
      return projects.filter((p) => p.clientId === membership.clientId);
    }

    // Internal non-admins (pm, tech) see only projects they are assigned to.
    const visible: Doc<"projects">[] = [];
    for (const p of projects) {
      const assignment = await ctx.db
        .query("projectAssignments")
        .withIndex("by_project_and_user", (q) =>
          q.eq("projectId", p._id).eq("userId", userId),
        )
        .unique();
      if (assignment) visible.push(p);
    }
    return visible;
  },
});

/** Full project bundle for the detail page. */
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const member = await requireMember(ctx);
    const { org } = member;
    const project = orgScoped(
      org._id,
      await ctx.db.get("projects", projectId),
    );
    await requireProjectAccess(ctx, member, projectId);

    const client = await ctx.db.get("clients", project.clientId);

    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .take(100);

    // Resolve assigned user profiles
    const assignmentDetails = [];
    for (const a of assignments) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", a.userId))
        .unique();
      assignmentDetails.push({ ...a, profile });
    }

    // Resolve default recipient contacts
    const defaultRecipients = [];
    for (const contactId of project.defaultRecipientContactIds) {
      const contact = await ctx.db.get("clientContacts", contactId);
      if (contact) defaultRecipients.push(contact);
    }

    return { project, client, assignments: assignmentDetails, defaultRecipients };
  },
});

/**
 * Tech/PM allocation across projects. Admin-only.
 *
 * Returns one row per active internal member (pm, tech, admin) with the
 * set of active projects they're assigned to. Drives the admin roster
 * page where directors decide who has capacity to shift between projects.
 */
export const listAllocations = query({
  args: {},
  handler: async (ctx) => {
    const { org } = await requirePermission(ctx, "canViewAllocation");

    const memberships = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org_and_userId", (q) => q.eq("orgId", org._id))
      .take(500);

    const activeInternal = memberships.filter(
      (m) =>
        m.status === "active" &&
        (m.role === "admin" || m.role === "pm" || m.role === "tech"),
    );

    const activeProjects = await ctx.db
      .query("projects")
      .withIndex("by_org_and_status", (q) =>
        q.eq("orgId", org._id).eq("status", "active"),
      )
      .take(500);
    const projectById = new Map(activeProjects.map((p) => [p._id, p]));

    const rows = [];
    for (const m of activeInternal) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", m.userId))
        .unique();
      const authUser = await ctx.db.get("users", m.userId);

      const assignments = await ctx.db
        .query("projectAssignments")
        .withIndex("by_user", (q) => q.eq("userId", m.userId))
        .take(200);

      const activeAssignments = assignments
        .filter((a) => projectById.has(a.projectId))
        .map((a) => {
          const p = projectById.get(a.projectId)!;
          return {
            assignmentId: a._id,
            projectId: a.projectId,
            projectName: p.name,
            jobNumber: p.jobNumber,
            role: a.role,
          };
        })
        .sort((a, b) => a.projectName.localeCompare(b.projectName));

      rows.push({
        userId: m.userId,
        membershipId: m._id,
        fullName: profile?.fullName ?? authUser?.email ?? "Unknown",
        email: authUser?.email ?? null,
        orgRole: m.role,
        assignments: activeAssignments,
      });
    }

    rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return rows;
  },
});

// ---------- Mutations ----------

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    jobNumber: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    defaultRecipientContactIds: v.optional(v.array(v.id("clientContacts"))),
  },
  handler: async (ctx, args) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("clients", args.clientId));

    return await ctx.db.insert("projects", {
      orgId: org._id,
      clientId: args.clientId,
      name: args.name,
      jobNumber: args.jobNumber,
      address: args.address,
      city: args.city,
      state: args.state,
      status: "active",
      defaultRecipientContactIds: args.defaultRecipientContactIds ?? [],
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    jobNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    status: v.optional(projectStatus),
    defaultRecipientContactIds: v.optional(v.array(v.id("clientContacts"))),
  },
  handler: async (ctx, { projectId, ...updates }) => {
    const { org } = await requireRole(ctx, ["admin"]);
    orgScoped(org._id, await ctx.db.get("projects", projectId));

    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) patch[key] = val;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("projects", projectId, patch);
    }
  },
});

export const updateSpecs = mutation({
  args: {
    projectId: v.id("projects"),
    specMinConcreteStrengthPsi: v.optional(v.number()),
    specMinCompactionPct: v.optional(v.number()),
    specProctorType: v.optional(
      v.union(v.literal("standard"), v.literal("modified")),
    ),
    specNotes: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, ...specs }) => {
    const { org } = await requireRole(ctx, ["admin", "pm"]);
    orgScoped(org._id, await ctx.db.get("projects", projectId));

    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(specs)) {
      if (val !== undefined) patch[k] = val;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch("projects", projectId, patch);
    }
  },
});

// ---------- Assignments ----------

export const assign = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: projectAssignmentRole,
  },
  handler: async (ctx, args) => {
    const { org } = await requirePermission(ctx, "canManageTeam");
    orgScoped(org._id, await ctx.db.get("projects", args.projectId));

    // Verify the user is a member of the same org.
    const targetMembership = await ctx.db
      .query("orgMemberships")
      .withIndex("by_org_and_userId", (q) =>
        q.eq("orgId", org._id).eq("userId", args.userId),
      )
      .unique();
    if (!targetMembership || targetMembership.status !== "active") {
      throw new ConvexError({ code: "USER_NOT_IN_ORG" });
    }

    // Prevent duplicate assignments.
    const existing = await ctx.db
      .query("projectAssignments")
      .withIndex("by_project_and_user", (q) =>
        q.eq("projectId", args.projectId).eq("userId", args.userId),
      )
      .unique();
    if (existing) {
      // Update role if it changed.
      if (existing.role !== args.role) {
        await ctx.db.patch("projectAssignments", existing._id, {
          role: args.role,
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("projectAssignments", {
      orgId: org._id,
      projectId: args.projectId,
      userId: args.userId,
      role: args.role,
    });
  },
});

export const unassign = mutation({
  args: { assignmentId: v.id("projectAssignments") },
  handler: async (ctx, { assignmentId }) => {
    const { org } = await requirePermission(ctx, "canManageTeam");
    orgScoped(
      org._id,
      await ctx.db.get("projectAssignments", assignmentId),
    );
    await ctx.db.delete("projectAssignments", assignmentId);
  },
});
