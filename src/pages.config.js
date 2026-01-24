/**
 * Pages Configuration Bridge
 * Re-exports from components/pages/config for backward compatibility
 */

import rawConfig from "./components/pages/config";

export const PAGE_ROUTE_ALIASES = rawConfig.PAGE_ROUTE_ALIASES;
export const PAGE_ROUTE_OVERRIDES = rawConfig.PAGE_ROUTE_OVERRIDES;

export default {
  PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES,
};