export type { ModuleId, NavigateFn, ModuleNavItem, ModuleDefinition, ModuleHostProps } from './types'
export {
  MODULES,
  DEFAULT_MODULE_ID,
  getModule,
  getDefaultModule,
  getNavItems,
  canAccessModule,
} from './registry'
export { default as ModuleHost } from './ModuleHost'
