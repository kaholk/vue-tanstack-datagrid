import { defineComponent, type PropType } from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'
import type { DataGridFilterConfig, DataGridFilterOption } from '../types'

type ElementRef = {
  value: HTMLElement | null
}

function toOptionKey(value: DataGridFilterOption['value']) {
  return value === null ? '__data_grid_empty__' : String(value)
}

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
    triggerRef: {
      type: Object as PropType<ElementRef>,
      default: undefined,
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
    const isRadioVariant = () => props.config.variant === 'radio'

    return () => (
      <DataGridDropdownMenu
        triggerRef={props.triggerRef}
        teleport
        menuClass="data-grid__filter-select-menu"
        scopeAttr="data-grid-filter-root"
        minWidth={280}
        desiredHeight={360}
        minAvailableHeight={180}
        chromeHeight={props.config.variant === 'radio' ? 92 : 132}
        maxOptionsHeightMin={96}
        zIndex={500}
        menuMaxHeightVar="--data-grid-filter-select-menu-max-height"
        optionsMaxHeightVar="--data-grid-filter-select-options-max-height"
      >
          <div class="data-grid__filter-select-content">
            <input
              class="data-grid__filter-select-search"
              value={props.searchValue}
              placeholder="Szukaj opcji"
              onClick={(event) => event.stopPropagation()}
              onInput={(event) => props.onSearchChange((event.target as HTMLInputElement).value)}
            />
            {!isRadioVariant() ? (
              <div class="data-grid__filter-select-actions">
                <button type="button" class="data-grid__filter-select-action" onClick={props.onSelectAll}>
                  Zaznacz wszystko
                </button>
                <button type="button" class="data-grid__filter-select-action" onClick={props.onClearAll}>
                  Odznacz wszystko
                </button>
              </div>
            ) : (
              <div class="data-grid__filter-select-actions data-grid__filter-select-actions--single">
                <button type="button" class="data-grid__filter-select-action" onClick={props.onClearAll}>
                  Wyczyść
                </button>
              </div>
            )}
            <div class="data-grid__filter-select-options data-grid__filter-select-options--menu">
              {props.visibleOptions.length > 0 ? (
                props.visibleOptions.map((option) => {
                  const selected = props.selectedValueKeys.has(toOptionKey(option.value))

                  return (
                    <label key={String(option.value)} class="data-grid__filter-select-option">
                      <input
                        class="data-grid__filter-select-native-control"
                        type={isRadioVariant() ? 'radio' : 'checkbox'}
                        name={isRadioVariant() ? `data-grid-filter-${props.config.id}` : undefined}
                        checked={selected}
                        onChange={(event) =>
                          props.onToggleValue(option.value, (event.target as HTMLInputElement).checked)
                        }
                      />
                      <span
                        class={[
                          'data-grid__filter-select-control',
                          isRadioVariant()
                            ? 'data-grid__filter-select-control--radio'
                            : 'data-grid__filter-select-control--checkbox',
                          selected ? 'data-grid__filter-select-control--checked' : '',
                        ]}
                        aria-hidden="true"
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })
              ) : (
                <div class="data-grid__filter-select-empty">Brak opcji</div>
              )}
            </div>
          </div>
      </DataGridDropdownMenu>
    )
  },
})
