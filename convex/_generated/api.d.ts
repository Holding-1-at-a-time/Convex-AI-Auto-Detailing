/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agent from "../agent.js";
import type * as analytics from "../analytics.js";
import type * as appointments from "../appointments.js";
import type * as business from "../business.js";
import type * as customers from "../customers.js";
import type * as dashboard from "../dashboard.js";
import type * as embeddings from "../embeddings.js";
import type * as internal_ from "../internal.js";
import type * as inventory from "../inventory.js";
import type * as marketing from "../marketing.js";
import type * as ml from "../ml.js";
import type * as recommendations from "../recommendations.js";
import type * as seed from "../seed.js";
import type * as services from "../services.js";
import type * as staff from "../staff.js";
import type * as utils from "../utils.js";
import type * as vehicles from "../vehicles.js";
import type * as workflow from "../workflow.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  analytics: typeof analytics;
  appointments: typeof appointments;
  business: typeof business;
  customers: typeof customers;
  dashboard: typeof dashboard;
  embeddings: typeof embeddings;
  internal: typeof internal_;
  inventory: typeof inventory;
  marketing: typeof marketing;
  ml: typeof ml;
  recommendations: typeof recommendations;
  seed: typeof seed;
  services: typeof services;
  staff: typeof staff;
  utils: typeof utils;
  vehicles: typeof vehicles;
  workflow: typeof workflow;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
