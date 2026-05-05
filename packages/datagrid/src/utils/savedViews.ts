export function createViewId() {
  return `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
