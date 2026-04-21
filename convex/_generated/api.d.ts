/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_generateTemplate from "../ai/generateTemplate.js";
import type * as ai_streamTemplate from "../ai/streamTemplate.js";
import type * as auth from "../auth.js";
import type * as certifications from "../certifications.js";
import type * as clients from "../clients.js";
import type * as email_send from "../email/send.js";
import type * as equipment from "../equipment.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as lab_mutations from "../lab/mutations.js";
import type * as lab_queries from "../lab/queries.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_customTemplates from "../lib/customTemplates.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as orgSettings from "../orgSettings.js";
import type * as pdf_renderer from "../pdf/renderer.js";
import type * as pdf_templates_ConcreteFieldTemplate from "../pdf/templates/ConcreteFieldTemplate.js";
import type * as pdf_templates_CustomTestTemplate from "../pdf/templates/CustomTestTemplate.js";
import type * as pdf_templates_DcpTemplate from "../pdf/templates/DcpTemplate.js";
import type * as pdf_templates_NuclearDensityTemplate from "../pdf/templates/NuclearDensityTemplate.js";
import type * as pdf_templates_PileLoadTemplate from "../pdf/templates/PileLoadTemplate.js";
import type * as pdf_templates_ProofRollTemplate from "../pdf/templates/ProofRollTemplate.js";
import type * as pdf_templates_Wrapper from "../pdf/templates/Wrapper.js";
import type * as pileTypes from "../pileTypes.js";
import type * as portal_internal from "../portal/internal.js";
import type * as portal_mutations from "../portal/mutations.js";
import type * as portal_queries from "../portal/queries.js";
import type * as proctors from "../proctors.js";
import type * as projects from "../projects.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as reports_attachments from "../reports/attachments.js";
import type * as reports_cylinders from "../reports/cylinders.js";
import type * as reports_dcpLayerMutations from "../reports/dcpLayerMutations.js";
import type * as reports_deliver from "../reports/deliver.js";
import type * as reports_densityReadings from "../reports/densityReadings.js";
import type * as reports_internal from "../reports/internal.js";
import type * as reports_mutations from "../reports/mutations.js";
import type * as reports_numbers from "../reports/numbers.js";
import type * as reports_pileLoadMutations from "../reports/pileLoadMutations.js";
import type * as reports_queries from "../reports/queries.js";
import type * as reports_transitions from "../reports/transitions.js";
import type * as specZones from "../specZones.js";
import type * as templateBlocks from "../templateBlocks.js";
import type * as testTemplates from "../testTemplates.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/generateTemplate": typeof ai_generateTemplate;
  "ai/streamTemplate": typeof ai_streamTemplate;
  auth: typeof auth;
  certifications: typeof certifications;
  clients: typeof clients;
  "email/send": typeof email_send;
  equipment: typeof equipment;
  http: typeof http;
  invitations: typeof invitations;
  "lab/mutations": typeof lab_mutations;
  "lab/queries": typeof lab_queries;
  "lib/auth": typeof lib_auth;
  "lib/customTemplates": typeof lib_customTemplates;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  orgSettings: typeof orgSettings;
  "pdf/renderer": typeof pdf_renderer;
  "pdf/templates/ConcreteFieldTemplate": typeof pdf_templates_ConcreteFieldTemplate;
  "pdf/templates/CustomTestTemplate": typeof pdf_templates_CustomTestTemplate;
  "pdf/templates/DcpTemplate": typeof pdf_templates_DcpTemplate;
  "pdf/templates/NuclearDensityTemplate": typeof pdf_templates_NuclearDensityTemplate;
  "pdf/templates/PileLoadTemplate": typeof pdf_templates_PileLoadTemplate;
  "pdf/templates/ProofRollTemplate": typeof pdf_templates_ProofRollTemplate;
  "pdf/templates/Wrapper": typeof pdf_templates_Wrapper;
  pileTypes: typeof pileTypes;
  "portal/internal": typeof portal_internal;
  "portal/mutations": typeof portal_mutations;
  "portal/queries": typeof portal_queries;
  proctors: typeof proctors;
  projects: typeof projects;
  pushSubscriptions: typeof pushSubscriptions;
  "reports/attachments": typeof reports_attachments;
  "reports/cylinders": typeof reports_cylinders;
  "reports/dcpLayerMutations": typeof reports_dcpLayerMutations;
  "reports/deliver": typeof reports_deliver;
  "reports/densityReadings": typeof reports_densityReadings;
  "reports/internal": typeof reports_internal;
  "reports/mutations": typeof reports_mutations;
  "reports/numbers": typeof reports_numbers;
  "reports/pileLoadMutations": typeof reports_pileLoadMutations;
  "reports/queries": typeof reports_queries;
  "reports/transitions": typeof reports_transitions;
  specZones: typeof specZones;
  templateBlocks: typeof templateBlocks;
  testTemplates: typeof testTemplates;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
