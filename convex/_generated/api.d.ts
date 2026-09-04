/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as admissions from "../admissions.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as bootstrap from "../bootstrap.js";
import type * as concerns from "../concerns.js";
import type * as conversations from "../conversations.js";
import type * as dashboard from "../dashboard.js";
import type * as finance from "../finance.js";
import type * as http from "../http.js";
import type * as inbox from "../inbox.js";
import type * as invites from "../invites.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_authPolicy from "../lib/authPolicy.js";
import type * as lib_schoolRelationships from "../lib/schoolRelationships.js";
import type * as operations from "../operations.js";
import type * as staffing from "../staffing.js";
import type * as students from "../students.js";
import type * as teachers from "../teachers.js";
import type * as users from "../users.js";
import type * as viewer from "../viewer.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  admissions: typeof admissions;
  attendance: typeof attendance;
  auth: typeof auth;
  bootstrap: typeof bootstrap;
  concerns: typeof concerns;
  conversations: typeof conversations;
  dashboard: typeof dashboard;
  finance: typeof finance;
  http: typeof http;
  inbox: typeof inbox;
  invites: typeof invites;
  "lib/auth": typeof lib_auth;
  "lib/authPolicy": typeof lib_authPolicy;
  "lib/schoolRelationships": typeof lib_schoolRelationships;
  operations: typeof operations;
  staffing: typeof staffing;
  students: typeof students;
  teachers: typeof teachers;
  users: typeof users;
  viewer: typeof viewer;
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

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
