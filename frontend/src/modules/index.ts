export type { ModuleId, NavigateFn, ModuleNavItem, ModuleDefinition, ModuleHostProps } from './types'
export {
  MODULES,
  getModule,
  getNavItems,
  canAccessModule,
} from './registry'
export { default as ModuleHost } from './ModuleHost'
