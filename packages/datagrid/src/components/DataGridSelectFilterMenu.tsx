import { defineComponent, type PropType } from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'
import type { DataGridFilterConfig, DataGridFilterOption } from '../types'

export default defineComponent({
  name: 'DataGridSelectFilterMenu',
  props: {
    config: {
      type: Object as PropType<DataGridFilterConfig>,
      required: true,
    },
    searchValue: {
      type: String,
      required: true,
    },
    visibleOptions: {
      type: Array as PropType<DataGridFilterOption[]>,
      required: true,
    },
    selectedValueKeys: {
      type: Object as PropType<Set<string>>,
      required: true,
    },
    onSearchChange: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
    onSelectAll: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onClearAll: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleValue: {
      type: Function as PropType<
        (optionValue: DataGridFilterOption['value'], checked: boolean) => void
      >,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <DataGridDropdownMenu menuClass="data-grid__filter-select-menu" scopeAttr="data-grid-filter-root">
        <input
          class="data-grid__filter-select-search"
          value={props.searchValue}
          placeholder="Szukaj opcji"
          onClick={(event) => event.stopPropagation()}
          onInput={(event) => props.onSearchChange((event.target as HTMLInputElement).value)}
        />
        <div class="data-grid__filter-select-actions">
          <button type="button" class="data-grid__filter-select-action" onClick={props.onSelectAll}>
            Zaznacz wszystko
          </button>
          <button type="button" class="data-grid__filter-select-action" onClick={props.onClearAll}>
            Odznacz wszystko
          </button>
        </div>
        <div class="data-grid__filter-select-options">
          {props.visibleOptions.length > 0 ? (
            props.visibleOptions.map((option) => (
              <label key={String(option.value)} class="data-grid__filter-select-option">
                <input
                  type="checkbox"
                  checked={props.selectedValueKeys.has(option.value === null ? '__data_grid_empty__' : String(option.value))}
                  onChange={(event) =>
                    props.onToggleValue(option.value, (event.target as HTMLInputElement).checked)
                  }
                />
                <span>{option.label}</span>
              </label>
            ))
          ) : (
            <div class="data-grid__filter-select-empty">Brak opcji</div>
          )}
        </div>
      </DataGridDropdownMenu>
    )
  },
})
