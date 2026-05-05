import { h, type VNodeChild } from 'vue'

export function renderFlexibleContent(render: unknown, props: Record<string, unknown>): VNodeChild {
  if (typeof render === 'function' || (typeof render === 'object' && render !== null)) {
    return h(render as never, props)
  }

  return render as VNodeChild
}
