import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// ---------- Shared validators (re-used as the schema grows) ----------

export const role = v.union(
  v.literal("admin"),
  v.literal("pm"),
  v.literal("tech"),
  v.literal("client"),
);

export const membershipStatus = v.union(
  v.literal("active"),
  v.literal("invited"),
  v.literal("disabled"),
);

export const projectStatus = v.union(
  v.literal("active"),
  v.literal("closed"),
  v.literal("on_hold"),
);

export const projectAssignmentRole = v.union(
  v.literal("pm"),
  v.literal("tech"),
  v.literal("observer"),
);

export const invitationStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
);

// ---------- Report validators ----------

export const reportKind = v.union(
  v.literal("concrete_field"),
  v.literal("nuclear_density"),
  v.literal("proof_roll"),
  v.literal("dcp"),
  v.literal("pile_load"),
  v.literal("custom"),
);

export const reportStatus = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("in_review"),
  v.literal("rejected"),
  v.literal("approved"),
  v.literal("delivered"),
  v.literal("archived"),
);

export const cylinderSetStatus = v.union(
  v.literal("cast"),
  v.literal("pickup_scheduled"),
  v.literal("picked_up"),
  v.literal("at_lab"),
  v.literal("complete"),
);

export const attachmentParentKind = v.union(
  v.literal("report"),
  v.literal("concreteCylinderSet"),
  v.literal("nuclearDensityReading"),
  v.literal("proofRoll"),
  v.literal("dcpTest"),
  v.literal("pileLoadTest"),
  v.literal("project"),
);

export const auditEvent = v.union(
  v.literal("created"),
  v.literal("edited"),
  v.literal("submitted"),
  v.literal("claimed_for_review"),
  v.literal("rejected"),
  v.literal("approved"),
  v.literal("pdf_generated"),
  v.literal("email_queued"),
  v.literal("email_sent"),
  v.literal("email_failed"),
  v.literal("portal_viewed"),
  v.literal("archived"),
  v.literal("restored"),
);
export default defineSchema({
  ...authTables,

  // ---------- Tenancy ----------
  orgs: defineTable({
    name: v.string(),
    slug: v.string(),
    displayName: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    primaryColor: v.optional(v.string()),
    // Email config is filled in M5; optional now.
    emailFromAddress: v.optional(v.string()),
    emailReplyTo: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  // Profile is layered on top of @convex-dev/auth's `users` table.
  // We do NOT extend authTables.users — Convex Auth manages those tables.
  // We join via `userId: v.id("users")` instead.
  userProfiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    phone: v.optional(v.string()),
    // PE credentials — populated for engineers who will sign/seal
    // (UI exposed in M4 for signature, seal field reserved for compliance work).
    peLicenseNumber: v.optional(v.string()),
    peStates: v.optional(v.array(v.string())),
    signatureStorageId: v.optional(v.id("_storage")),
    sealStorageId: v.optional(v.id("_storage")),
  }).index("by_userId", ["userId"]),

  // Role lives on the membership, not on the profile, so a user can
  // belong to multiple orgs in Phase 2 without a migration.
  orgMemberships: defineTable({
    orgId: v.id("orgs"),
    userId: v.id("users"),
    role,
    status: membershipStatus,
    invitedAt: v.optional(v.number()),
    // Only set when role === "client". Links the user to their client company
    // so we can scope data access to their company's projects/reports.
    clientId: v.optional(v.id("clients")),
    // Per-user permission overrides. When unset, the role's default applies.
    // Admin always has all permissions regardless of these flags.
    canViewAllProjects: v.optional(v.boolean()),
    canManageTeam: v.optional(v.boolean()),
    canViewAllocation: v.optional(v.boolean()),
    canApproveReports: v.optional(v.boolean()),
    canManageTestTemplates: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_org_and_userId", ["orgId", "userId"])
    .index("by_org_and_role", ["orgId", "role"]),

  // Atomic counter for human-readable identifiers (e.g., "CMT-2026-00142").
  // Single-row-per-key; mutations patch + read inside one transaction.
  counters: defineTable({
    orgId: v.id("orgs"),
    key: v.string(),
    value: v.number(),
  }).index("by_org_and_key", ["orgId", "key"]),

  // Pre-auth invitations. Admin creates a row with the target email and
  // role. When that user signs up via Convex Auth, the UI calls
  // claimInvitation which matches by email, creates their profile +
  // membership, and marks the invitation accepted.
  orgInvitations: defineTable({
    orgId: v.id("orgs"),
    email: v.string(),
    fullName: v.string(),
    role,
    status: invitationStatus,
    invitedByUserId: v.id("users"),
    invitedAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedByUserId: v.optional(v.id("users")),
    revokedAt: v.optional(v.number()),
    revokedByUserId: v.optional(v.id("users")),
    // Only set when role === "client". Carried into orgMembership on acceptance.
    clientId: v.optional(v.id("clients")),
  })
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_email_and_status", ["email", "status"]),

  // ---------- Clients & projects ----------
  clients: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),
    notes: v.optional(v.string()),
  }).index("by_org_and_name", ["orgId", "name"]),

  // EPC/GC contacts who receive reports. May optionally be invited to
  // create an account (orgMembership with role "client"). Access to
  // reports is also granted through magic-link portalTokens (M5).
  clientContacts: defineTable({
    orgId: v.id("orgs"),
    clientId: v.id("clients"),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_org_and_email", ["orgId", "email"])
    .index("by_client", ["clientId"]),

  projects: defineTable({
    orgId: v.id("orgs"),
    clientId: v.id("clients"),
    name: v.string(),
    jobNumber: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    status: projectStatus,
    defaultRecipientContactIds: v.array(v.id("clientContacts")),
    // Project specifications — acceptance criteria for field tests
    specMinConcreteStrengthPsi: v.optional(v.number()),
    specMinCompactionPct: v.optional(v.number()),
    specProctorType: v.optional(v.union(v.literal("standard"), v.literal("modified"))),
    specNotes: v.optional(v.string()),
  })
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_jobNumber", ["orgId", "jobNumber"])
    .index("by_client", ["clientId"]),

  projectAssignments: defineTable({
    orgId: v.id("orgs"),
    projectId: v.id("projects"),
    userId: v.id("users"),
    role: projectAssignmentRole,
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_project_and_user", ["projectId", "userId"]),

  // ---------- Project pile types ----------
  // Each project can define its own pile types with associated specs and colors.
  projectPileTypes: defineTable({
    orgId: v.id("orgs"),
    projectId: v.id("projects"),
    name: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    designLoadKips: v.optional(v.number()),
    installedLengthFt: v.optional(v.number()),
    failureCriterion: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // ---------- Project spec zones ----------
  // Each zone defines acceptance criteria for a specific area of the project.
  // Zones are user-defined: custom names, coordinates, and per-zone specs.
  projectSpecZones: defineTable({
    orgId: v.id("orgs"),
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    // Flexible location info — GPS coordinates, grid refs, station ranges, etc.
    coordinates: v.optional(v.string()),
    // Soil / compaction specs
    specMinCompactionPct: v.optional(v.number()),
    specProctorType: v.optional(v.union(v.literal("standard"), v.literal("modified"))),
    referencedProctorId: v.optional(v.id("proctorCurves")),
    // Concrete specs
    specMinConcreteStrengthPsi: v.optional(v.number()),
    // Pile load specs
    specPileType: v.optional(v.string()),
    specPileDesignLoadKips: v.optional(v.number()),
    specPileFailureCriterion: v.optional(v.string()),
    // General
    specNotes: v.optional(v.string()),
    sortOrder: v.number(),
  }).index("by_project", ["projectId"]),

  // ---------- Reports (parent) ----------
  reports: defineTable({
    orgId: v.id("orgs"),
    projectId: v.id("projects"),
    kind: reportKind,
    status: reportStatus,
    number: v.string(),

    createdByUserId: v.id("users"),
    submittedAt: v.optional(v.number()),
    reviewingUserId: v.optional(v.id("users")),
    reviewingSince: v.optional(v.number()),

    approvedByUserId: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    approvalId: v.optional(v.id("reportApprovals")),

    rejectedByUserId: v.optional(v.id("users")),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),

    deliveredAt: v.optional(v.number()),
    pdfStorageId: v.optional(v.id("_storage")),

    // Soft-delete: stores the status before archiving so we can restore
    archivedFromStatus: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    archivedByUserId: v.optional(v.id("users")),

    // Optional link to a project spec zone (for per-area acceptance criteria)
    specZoneId: v.optional(v.id("projectSpecZones")),

    fieldDate: v.number(),
    weather: v.optional(v.object({
      tempF: v.optional(v.number()),
      conditions: v.optional(v.string()),
      windMph: v.optional(v.number()),
    })),
    locationNote: v.optional(v.string()),
    stationFrom: v.optional(v.string()),
    stationTo: v.optional(v.string()),

    // Pointer to the kind-specific child row. Always set after creation.
    detailId: v.union(
      v.id("concreteFieldTests"),
      v.id("nuclearDensityTests"),
      v.id("proofRollObservations"),
      v.id("dcpTests"),
      v.id("pileLoadTests"),
      v.id("customTestResponses"),
    ),
  })
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_project_and_status", ["projectId", "status"])
    .index("by_createdBy_and_status", ["createdByUserId", "status"])
    .index("by_org_and_number", ["orgId", "number"]),

  // ---------- Concrete field (C143/C231/C1064/C31) ----------
  concreteFieldTests: defineTable({
    orgId: v.id("orgs"),
    // Optional to break circular insert; always set immediately via patch.
    reportId: v.optional(v.id("reports")),
    mixDesignNumber: v.optional(v.string()),
    designStrengthPsi: v.optional(v.number()),
    supplier: v.optional(v.string()),
    ticketNumber: v.optional(v.string()),
    truckNumber: v.optional(v.string()),
    cubicYards: v.optional(v.number()),
    placementLocation: v.optional(v.string()),
    batchTime: v.optional(v.number()),
    sampleTime: v.optional(v.number()),
    slumpInches: v.optional(v.number()),
    airContentPct: v.optional(v.number()),
    airMethod: v.optional(v.union(v.literal("pressure"), v.literal("volumetric"))),
    concreteTempF: v.optional(v.number()),
    ambientTempF: v.optional(v.number()),
    unitWeightPcf: v.optional(v.number()),
    admixtureNotes: v.optional(v.string()),
  }).index("by_report", ["reportId"]),

  concreteCylinderSets: defineTable({
    orgId: v.id("orgs"),
    reportId: v.id("reports"),
    concreteFieldTestId: v.id("concreteFieldTests"),
    setLabel: v.string(),
    castDate: v.number(),
    pickupScheduledFor: v.optional(v.number()),
    pickedUpAt: v.optional(v.number()),
    pickedUpByUserId: v.optional(v.id("users")),
    labReceivedAt: v.optional(v.number()),
    status: cylinderSetStatus,
  })
    .index("by_report", ["reportId"])
    .index("by_org_and_status", ["orgId", "status"]),

  concreteCylinders: defineTable({
    orgId: v.id("orgs"),
    setId: v.id("concreteCylinderSets"),
    cylinderNumber: v.string(),
    breakAgeDays: v.number(),
    breakDate: v.optional(v.number()),
    brokenByUserId: v.optional(v.id("users")),
    actualAgeDays: v.optional(v.number()),
    loadLbs: v.optional(v.number()),
    areaSqIn: v.optional(v.number()),
    strengthPsi: v.optional(v.number()),
    fractureType: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_set", ["setId"])
    .index("by_org_and_breakAge", ["orgId", "breakAgeDays"]),

  // ---------- Nuclear density (ASTM D6938) ----------
  nuclearDensityTests: defineTable({
    orgId: v.id("orgs"),
    reportId: v.optional(v.id("reports")),
    gaugeModel: v.optional(v.string()),
    gaugeSerialNumber: v.optional(v.string()),
    standardCountDate: v.optional(v.number()),
    referencedProctorId: v.optional(v.id("proctorCurves")),
    materialDescription: v.optional(v.string()),
    liftNumber: v.optional(v.number()),
  }).index("by_report", ["reportId"]),

  nuclearDensityReadings: defineTable({
    orgId: v.id("orgs"),
    nuclearDensityTestId: v.id("nuclearDensityTests"),
    reportId: v.id("reports"),
    testNumber: v.string(),
    station: v.optional(v.string()),
    offset: v.optional(v.string()),
    elevation: v.optional(v.string()),
    depthInches: v.number(),
    wetDensityPcf: v.number(),
    moisturePct: v.number(),
    dryDensityPcf: v.number(),
    maxDryDensityPcf: v.number(),
    optimumMoisturePct: v.number(),
    compactionPct: v.number(),
    passed: v.boolean(),
    retestOfReadingId: v.optional(v.id("nuclearDensityReadings")),
    notes: v.optional(v.string()),
  })
    .index("by_test", ["nuclearDensityTestId"])
    .index("by_report", ["reportId"]),

  proctorCurves: defineTable({
    orgId: v.id("orgs"),
    label: v.string(),
    materialDescription: v.string(),
    maxDryDensityPcf: v.number(),
    optimumMoisturePct: v.number(),
    sourceLabReportStorageId: v.optional(v.id("_storage")),
  }).index("by_org_and_label", ["orgId", "label"]),

  // ---------- Proof roll ----------
  proofRollObservations: defineTable({
    orgId: v.id("orgs"),
    reportId: v.optional(v.id("reports")),
    equipmentUsed: v.optional(v.string()),
    numberOfPasses: v.optional(v.number()),
    areaDescription: v.optional(v.string()),
    result: v.optional(v.union(v.literal("pass"), v.literal("fail"), v.literal("conditional"))),
    failureZones: v.optional(v.string()),
    recommendations: v.optional(v.string()),
  }).index("by_report", ["reportId"]),

  // ---------- DCP (ASTM D6951) ----------
  dcpTests: defineTable({
    orgId: v.id("orgs"),
    reportId: v.optional(v.id("reports")),
    testLocation: v.optional(v.string()),
    groundwaterDepthIn: v.optional(v.number()),
    hammerWeightLbs: v.optional(v.number()),
  }).index("by_report", ["reportId"]),

  dcpLayers: defineTable({
    orgId: v.id("orgs"),
    dcpTestId: v.id("dcpTests"),
    reportId: v.id("reports"),
    sequence: v.number(),
    fromDepthIn: v.number(),
    toDepthIn: v.number(),
    blowCount: v.number(),
    dcpIndexMmPerBlow: v.number(),
    estimatedCbrPct: v.number(),
    soilDescription: v.optional(v.string()),
  }).index("by_test_and_sequence", ["dcpTestId", "sequence"]),

  // ---------- Pile load (ASTM D1143 static / D4945 dynamic) ----------
  pileLoadTests: defineTable({
    orgId: v.id("orgs"),
    reportId: v.optional(v.id("reports")),
    // Test method: how the load is applied
    testMethod: v.optional(v.union(v.literal("static"), v.literal("dynamic"), v.literal("statnamic"))),
    // Load direction: what the test is measuring
    loadDirection: v.optional(v.union(
      v.literal("axial_compression"),
      v.literal("axial_tension"),
      v.literal("lateral"),
    )),
    pileId: v.optional(v.string()),
    pileType: v.optional(v.string()),
    pileTypeId: v.optional(v.id("projectPileTypes")),
    // Solar layout identification
    blockNumber: v.optional(v.string()),
    rowNumber: v.optional(v.string()),
    pileNumber: v.optional(v.string()),
    installedLength: v.optional(v.number()),
    testDate: v.optional(v.number()),
    designLoadKips: v.optional(v.number()),
    maxLoadKips: v.optional(v.number()),
    failureCriterionNotes: v.optional(v.string()),
    result: v.optional(v.union(v.literal("pass"), v.literal("fail"), v.literal("inconclusive"))),
  }).index("by_report", ["reportId"]),

  // Load increments applied over the course of the test (10-20 per test).
  pileLoadIncrements: defineTable({
    orgId: v.id("orgs"),
    pileLoadTestId: v.id("pileLoadTests"),
    reportId: v.id("reports"),
    sequence: v.number(),
    loadKips: v.number(),
    appliedAt: v.number(),
    heldForMinutes: v.number(),
    netSettlementIn: v.number(),
  }).index("by_test_and_sequence", ["pileLoadTestId", "sequence"]),

  // High-frequency dial gauge / strain readings. Potentially hundreds per test.
  pileLoadReadings: defineTable({
    orgId: v.id("orgs"),
    pileLoadTestId: v.id("pileLoadTests"),
    pileLoadIncrementId: v.optional(v.id("pileLoadIncrements")),
    reportId: v.id("reports"),
    sequence: v.number(),
    recordedAt: v.number(),
    loadKips: v.optional(v.number()),
    dialGauge1In: v.optional(v.number()),
    dialGauge2In: v.optional(v.number()),
    averageSettlementIn: v.optional(v.number()),
  })
    .index("by_test_and_sequence", ["pileLoadTestId", "sequence"])
    .index("by_report", ["reportId"]),

  // ---------- Cross-cutting ----------
  attachments: defineTable({
    orgId: v.id("orgs"),
    parentKind: attachmentParentKind,
    parentId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    caption: v.optional(v.string()),
    uploadedByUserId: v.id("users"),
    // Optional geolocation stamp captured at upload time. Lets clients see
    // *where* a photo was taken without relying on EXIF (which iOS strips on
    // camera-capture web uploads). `gpsSource` distinguishes a fresh device
    // fix from a fallback.
    gpsLat: v.optional(v.number()),
    gpsLng: v.optional(v.number()),
    gpsAccuracyM: v.optional(v.number()),
    gpsCapturedAt: v.optional(v.number()),
    gpsSource: v.optional(
      v.union(v.literal("device"), v.literal("exif"), v.literal("manual")),
    ),
  })
    .index("by_parent", ["parentKind", "parentId"])
    .index("by_org_and_parent", ["orgId", "parentKind", "parentId"]),

  /**
   * Web-push subscription endpoints. One row per (user, device). The `endpoint`
   * URL is unique per device/install; we upsert on it so reinstalling the PWA
   * refreshes the keys cleanly. `disabledAt` marks endpoints the push server
   * reported as 404/410 ("Gone") so we stop sending to them.
   */
  pushSubscriptions: defineTable({
    userId: v.id("users"),
    orgId: v.id("orgs"),
    endpoint: v.string(),
    p256dhKey: v.string(),
    authKey: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    disabledAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  reportAuditLog: defineTable({
    orgId: v.id("orgs"),
    reportId: v.id("reports"),
    at: v.number(),
    actorUserId: v.optional(v.id("users")),
    actorLabel: v.optional(v.string()),
    event: auditEvent,
    metadata: v.optional(v.string()),
  })
    .index("by_report_and_at", ["reportId", "at"])
    .index("by_org_and_at", ["orgId", "at"]),

  reportApprovals: defineTable({
    orgId: v.id("orgs"),
    reportId: v.id("reports"),
    approvedByUserId: v.id("users"),
    approvedAt: v.number(),
    comments: v.optional(v.string()),
    signatureStorageId: v.id("_storage"),
    peSealStorageId: v.optional(v.id("_storage")),
    peLicenseNumberAtTime: v.optional(v.string()),
    peStateAtTime: v.optional(v.string()),
  }).index("by_report", ["reportId"]),

  // ---------- Portal & delivery (M5) ----------

  // Magic-link tokens for the client portal. One token per (report, contact).
  portalTokens: defineTable({
    orgId: v.id("orgs"),
    reportId: v.id("reports"),
    clientContactId: v.id("clientContacts"),
    token: v.string(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    firstAccessedAt: v.optional(v.number()),
    lastAccessedAt: v.optional(v.number()),
    accessCount: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_report", ["reportId"])
    .index("by_contact_and_expires", ["clientContactId", "expiresAt"]),

  // Tracks delivery of each report to each recipient.
  reportDeliveries: defineTable({
    orgId: v.id("orgs"),
    reportId: v.id("reports"),
    clientContactId: v.id("clientContacts"),
    portalTokenId: v.id("portalTokens"),
    pdfStorageId: v.id("_storage"),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed"),
    ),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  })
    .index("by_report", ["reportId"])
    .index("by_org_and_status", ["orgId", "status"]),

  // ---------- Equipment register ----------
  equipment: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),
    type: v.union(
      v.literal("nuclear_gauge"),
      v.literal("air_meter"),
      v.literal("compression_machine"),
      v.literal("dcp"),
      v.literal("other"),
    ),
    model: v.optional(v.string()),
    serialNumber: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    calibrationDueDate: v.optional(v.number()),
    lastCalibratedAt: v.optional(v.number()),
    // Nuclear gauge specific
    nrcLicenseNumber: v.optional(v.string()),
    leakTestDueDate: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("out_of_service"), v.literal("retired")),
    notes: v.optional(v.string()),
  }).index("by_org_and_status", ["orgId", "status"]),

  // ---------- Custom test templates & responses ----------
  //
  // Templates are org-owned forms PMs/admins build themselves for edge-case
  // tests that don't fit the five built-in kinds. `fieldsJson` stores the
  // ordered list of field definitions as a JSON string — shape is validated
  // by convex/lib/customTemplates.ts (both when creating and when rendering).
  // We use a JSON string instead of a strict validator because the discriminated
  // union of 10+ field types (including recursive tables) is awkward to express
  // in Convex's v.union() and would need a migration every time we add a type.
  testTemplates: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdByUserId: v.id("users"),
    fieldsJson: v.string(),
  })
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_name", ["orgId", "name"]),

  // One row per custom report submission. `templateFieldsJson` snapshots the
  // template's fields at creation time, so later edits to the template never
  // corrupt a submitted report. `valuesJson` is the tech's submitted answers,
  // keyed by field id.
  customTestResponses: defineTable({
    orgId: v.id("orgs"),
    reportId: v.optional(v.id("reports")),
    templateId: v.id("testTemplates"),
    templateNameAtCreation: v.string(),
    templateFieldsJson: v.string(),
    valuesJson: v.string(),
  }).index("by_report", ["reportId"]),

  // Reusable field blocks — "Site conditions", "Inspector info", etc.
  // A PM saves a group of fields once, then inserts them into any template.
  // Stored as fieldsJson (same shape as testTemplates but typically just a
  // handful of fields). Org-scoped; not versioned.
  templateBlocks: defineTable({
    orgId: v.id("orgs"),
    name: v.string(),
    description: v.optional(v.string()),
    createdByUserId: v.id("users"),
    fieldsJson: v.string(),
  }).index("by_org_and_name", ["orgId", "name"]),

  // ---------- Technician certifications ----------
  techCertifications: defineTable({
    orgId: v.id("orgs"),
    userId: v.id("users"),
    type: v.union(
      v.literal("aci_concrete_field_1"),
      v.literal("aci_concrete_field_2"),
      v.literal("aci_concrete_strength"),
      v.literal("nuclear_gauge_rso"),
      v.literal("nicet_level_1"),
      v.literal("nicet_level_2"),
      v.literal("nicet_level_3"),
      v.literal("nicet_level_4"),
      v.literal("pe_license"),
      v.literal("other"),
    ),
    customLabel: v.optional(v.string()),
    certificationNumber: v.optional(v.string()),
    issuedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    documentStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  }).index("by_org_and_user", ["orgId", "userId"]),
});
