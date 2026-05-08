import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'

import type { DataGridFilterConfig } from '../../types'

type QuickFilterItem = {
  id: string
  width?: number | string
  config: DataGridFilterConfig
}

export default defineComponent({
  name: 'DataGridQuickFilters',
  props: {
    quickFilters: {
      type: Array as PropType<QuickFilterItem[]>,
      required: true,
    },
    renderFilterControl: {
      type: Function as PropType<
        (config: DataGridFilterConfig, options?: { toolbar?: boolean }) => VNodeChild
      >,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <div class="data-grid__quick-search">
        {props.quickFilters.map((quickFilter) => (
          <div
            key={quickFilter.id}
            class="data-grid__quick-search-filter"
            style={
              quickFilter.width
                ? ({
                    '--data-grid-quick-filter-width':
                      typeof quickFilter.width === 'number'
                        ? `${quickFilter.width}px`
                        : quickFilter.width,
                  } as CSSProperties)
                : undefined
            }
          >
            <span class="data-grid__quick-search-label">{quickFilter.config.label}</span>
            {props.renderFilterControl(quickFilter.config, { toolbar: true })}
          </div>
        ))}
      </div>
    )
  },
})
