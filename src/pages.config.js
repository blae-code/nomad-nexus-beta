// Normalize pages config: extract .default if needed, handle module objects
import rawConfig from "./components/pages/config";

const asComponent = (maybeModule) => maybeModule?.default ?? maybeModule;

const config = {
  PAGE_ROUTE_ALIASES: rawConfig.PAGE_ROUTE_ALIASES,
  PAGE_ROUTE_OVERRIDES: rawConfig.PAGE_ROUTE_OVERRIDES,
};

export default config;
export const { PAGE_ROUTE_ALIASES, PAGE_ROUTE_OVERRIDES } = config;