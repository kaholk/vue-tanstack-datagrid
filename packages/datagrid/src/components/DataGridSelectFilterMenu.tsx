import { defineComponent, ref, type PropType } from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'
import DataGridSelectMenuContent, {
  toDataGridSelectOptionKey,
} from './DataGridSelectMenuContent'
import type { DataGridFilterConfig, DataGridFilterOption } from '../types'

type ElementRef = {
  value: HTMLElement | null
}

function toFilterTextToken(value: DataGridFilterOption['value']) {
  return value === null || value === '' ? '""' : String(value)
}

function getFilterOptionValueFromText(value: string, options: DataGridFilterOption[]) {
  if (value === '""' || value === "''") {
    const emptyOption = options.find((option) => option.value === null || option.value === '')
    return emptyOption?.value ?? null
  }

  const matchingOption = options.find((option) => String(option.value ?? '') === value)
  return matchingOption?.value ?? value
}

function getOptionValuesText(
  values: DataGridFilterOption['value'][],
  separator: string,
) {
  return values
    .map((value) => toFilterTextToken(value))
    .filter((value) => value !== '')
    .join(separator)
}

function getValuesFromText(
  text: string,
  options: DataGridFilterOption[],
  separator: string,
) {
  const values = text
    .split(separator)
    .map((value) => value.trim())
    .filter((value) => value !== '')

  return values.map((value) => getFilterOptionValueFromText(value, options))
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
    allOptions: {
      type: Array as PropType<DataGridFilterOption[]>,
      required: true,
    },
    visibleOptions: {
      type: Array as PropType<DataGridFilterOption[]>,
      required: true,
    },
    optionsLoading: {
      type: Boolean,
      default: false,
    },
    selectedValueKeys: {
      type: Object as PropType<Set<string>>,
      required: true,
    },
    triggerRef: {
      type: Object as PropType<ElementRef>,
      default: undefined,
    },
    teleport: {
      type: Boolean,
      default: true,
    },
    textMode: {
      type: Boolean,
      default: false,
    },
    textValue: {
      type: String,
      default: '',
    },
    onSearchChange: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
    onApply: {
      type: Function as PropType<(value: string | DataGridFilterOption['value'][], textMode: boolean) => void>,
      required: true,
    },
    onCommit: {
      type: Function as PropType<(value: string | DataGridFilterOption['value'][], textMode: boolean) => void>,
      required: true,
    },
    onCancel: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    const isRadioVariant = () => props.config.variant === 'radio'
    const isAsyncOptions = () => Boolean(props.config.optionsResolver)
    const valueSeparator = () => props.config.valueSeparator ?? '|'
    const draftTextMode = ref(props.textMode)
    const draftTextValue = ref(props.textValue)
    const draftSelectedValueKeys = ref(new Set(props.selectedValueKeys))

    function resetDraft() {
      draftTextMode.value = props.textMode
      draftTextValue.value = props.textValue
      draftSelectedValueKeys.value = new Set(props.selectedValueKeys)
    }

    function getDraftSelectedValues() {
      return props.allOptions
        .filter((option) => draftSelectedValueKeys.value.has(toDataGridSelectOptionKey(option.value)))
        .map((option) => option.value)
    }

    function switchTextMode(enabled: boolean) {
      if (enabled === draftTextMode.value) {
        return
      }

      if (enabled) {
        draftTextValue.value = getOptionValuesText(getDraftSelectedValues(), valueSeparator())
      } else {
        draftSelectedValueKeys.value = new Set(
          getValuesFromText(draftTextValue.value, props.allOptions, valueSeparator()).map((value) =>
            toDataGridSelectOptionKey(value),
          ),
        )
      }

      draftTextMode.value = enabled
    }

    function selectAllOptions() {
      draftSelectedValueKeys.value = new Set(
        props.allOptions.map((option) => toDataGridSelectOptionKey(option.value)),
      )
    }

    function clearOptions() {
      draftSelectedValueKeys.value = new Set()
      draftTextValue.value = ''
    }

    function toggleOption(optionValue: DataGridFilterOption['value'], checked: boolean) {
      const optionKey = toDataGridSelectOptionKey(optionValue)

      if (isRadioVariant()) {
        draftSelectedValueKeys.value = checked ? new Set([optionKey]) : new Set()
        return
      }

      const nextKeys = new Set(draftSelectedValueKeys.value)

      if (checked) {
        nextKeys.add(optionKey)
      } else {
        nextKeys.delete(optionKey)
      }

      draftSelectedValueKeys.value = nextKeys
    }

    function applyFilter() {
      if (draftTextMode.value) {
        props.onApply(draftTextValue.value.trim(), true)
        return
      }

      props.onApply(getDraftSelectedValues(), false)
    }

    function commitDraft() {
      if (draftTextMode.value) {
        props.onCommit(draftTextValue.value.trim(), true)
        return
      }

      props.onCommit(getDraftSelectedValues(), false)
    }

    function toggleMode() {
      switchTextMode(!draftTextMode.value)
    }

    function getVisibleOptions() {
      return props.visibleOptions
    }

    return () => (
      <DataGridDropdownMenu
        triggerRef={props.triggerRef}
        teleport={props.teleport}
        menuClass="data-grid__filter-select-menu"
        scopeAttr="data-grid-filter-root"
        minWidth={280}
        desiredHeight={360}
        minAvailableHeight={180}
        chromeHeight={props.config.variant === 'radio' ? 132 : 172}
        maxOptionsHeightMin={96}
        zIndex={500}
        menuMaxHeightVar="--data-grid-filter-select-menu-max-height"
        optionsMaxHeightVar="--data-grid-filter-select-options-max-height"
        outsideClickRootAttr="data-grid-filter-root"
        onOutsidePointerDown={commitDraft}
      >
        <div class="data-grid__filter-select-content data-grid__filter-select-content--compact">
          <div class="data-grid__filter-select-toolbar">
            {draftTextMode.value ? (
              <input
                class="data-grid__filter-select-search"
                value={draftTextValue.value}
                placeholder={props.config.placeholder ?? 'Filtr'}
                onClick={(event) => event.stopPropagation()}
                onInput={(event) => {
                  draftTextValue.value = (event.target as HTMLInputElement).value
                }}
                onKeydown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.stopPropagation()
                    applyFilter()
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault()
                    event.stopPropagation()
                    resetDraft()
                    props.onCancel()
                  }
                }}
              />
            ) : (
              <div class="data-grid__filter-select-search-wrap">
                <input
                  class={[
                    'data-grid__filter-select-search',
                    isAsyncOptions() && props.searchValue ? 'data-grid__filter-select-search--clearable' : '',
                  ]}
                  value={props.searchValue}
                  placeholder="Szukaj opcji"
                  onClick={(event) => event.stopPropagation()}
                  onInput={(event) =>
                    props.onSearchChange((event.target as HTMLInputElement).value)
                  }
                />
                {isAsyncOptions() && props.searchValue ? (
                  <button
                    type="button"
                    class="data-grid__filter-select-search-clear"
                    title="Wyczyść"
                    aria-label="Wyczyść"
                    onClick={(event) => {
                      event.stopPropagation()
                      props.onSearchChange('')
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            )}
            {props.config.textFallback ? (
              <button
                type="button"
                class="data-grid__filter-select-icon-action"
                title={draftTextMode.value ? 'Lista' : 'Tekst'}
                aria-label={draftTextMode.value ? 'Lista' : 'Tekst'}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleMode()
                }}
              >
                {draftTextMode.value ? '☷' : 'T'}
              </button>
            ) : null}
            {!draftTextMode.value ? (
              <button
                type="button"
                class="data-grid__filter-select-icon-action"
                title="Zaznacz wszystko"
                aria-label="Zaznacz wszystko"
                onClick={(event) => {
                  event.stopPropagation()
                  selectAllOptions()
                }}
              >
                ✓
              </button>
            ) : null}
            <button
              type="button"
              class="data-grid__filter-select-icon-action"
              title={draftTextMode.value || isRadioVariant() ? 'Wyczyść' : 'Odznacz wszystko'}
              aria-label={draftTextMode.value || isRadioVariant() ? 'Wyczyść' : 'Odznacz wszystko'}
              onClick={(event) => {
                event.stopPropagation()
                clearOptions()
              }}
            >
              ×
            </button>
          </div>
          {draftTextMode.value ? (
            <div class="data-grid__filter-select-empty">Tryb tekstowy</div>
          ) : (
            <DataGridSelectMenuContent
              searchValue=""
              searchPlaceholder="Szukaj opcji"
              options={getVisibleOptions()}
              emptyLabel={props.optionsLoading ? 'Ładowanie...' : 'Brak opcji'}
              selectedValueKeys={draftSelectedValueKeys.value}
              multiple={!isRadioVariant()}
              optionName={isRadioVariant() ? `data-grid-filter-${props.config.id}` : undefined}
              optionsMenuClass="data-grid__filter-select-options--menu"
              showSearch={false}
              showActions={false}
              selectAllLabel="Zaznacz wszystko"
              clearLabel={isRadioVariant() ? 'Wyczyść' : 'Odznacz wszystko'}
              renderShell={false}
              onSearchChange={props.onSearchChange}
              onSelectAll={selectAllOptions}
              onClearAll={clearOptions}
              onToggleValue={toggleOption}
            />
          )}
          <div class="data-grid__filter-select-footer">
            <button
              type="button"
              class="data-grid__filter-select-action"
              onClick={(event) => {
                event.stopPropagation()
                resetDraft()
                props.onCancel()
              }}
            >
              Anuluj
            </button>
            <button
              type="button"
              class="data-grid__filter-select-action data-grid__filter-select-action--primary"
              onClick={(event) => {
                event.stopPropagation()
                applyFilter()
              }}
            >
              Filtruj
            </button>
          </div>
        </div>
      </DataGridDropdownMenu>
    )
  },
})
