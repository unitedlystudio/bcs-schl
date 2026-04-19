/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from '../access.js';
import type * as admissions from '../admissions.js';
import type * as attendance from '../attendance.js';
import type * as concerns from '../concerns.js';
import type * as conversations from '../conversations.js';
import type * as dashboard from '../dashboard.js';
import type * as finance from '../finance.js';
import type * as inbox from '../inbox.js';
import type * as lib_auth from '../lib/auth.js';
import type * as operations from '../operations.js';
import type * as seed from '../seed.js';
import type * as students from '../students.js';
import type * as teachers from '../teachers.js';

import type { ApiFromModules, FilterApi, FunctionReference } from 'convex/server';

declare const fullApi: ApiFromModules<{
  access: typeof access;
  admissions: typeof admissions;
  attendance: typeof attendance;
  concerns: typeof concerns;
  conversations: typeof conversations;
  dashboard: typeof dashboard;
  finance: typeof finance;
  inbox: typeof inbox;
  'lib/auth': typeof lib_auth;
  operations: typeof operations;
  seed: typeof seed;
  students: typeof students;
  teachers: typeof teachers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, 'public'>>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, 'internal'>>;

export declare const components: {};
