// MF container shim — re-exports the service registry from @listo/ui-core
// so the rsbuild expose path ("./registry") still resolves.
export {
  RegistryProvider,
  useServiceRegistry,
} from "@listo/ui-core";
export type { ServiceKey, ServiceRegistry } from "@listo/ui-core";
