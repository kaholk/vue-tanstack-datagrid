import { defineComponent, type PropType } from 'vue'

import type { DataGridFilterOption, DataGridFilterOptionValue } from '../types'

export function toDataGridSelectOptionKey(value: DataGridFilterOptionValue) {
  return value === null ? '__data_grid_null__' : String(value)
}

export default defineComponent({
  name: 'DataGridSelectMenuContent',
  props: {
    searchValue: {
      type: String,
      required: true,
    },
    searchPlaceholder: {
      type: String,
      default: 'Szukaj opcji',
    },
    options: {
      type: Array as PropType<DataGridFilterOption[]>,
      required: true,
    },
    selectedValueKeys: {
      type: Object as PropType<Set<string>>,
      required: true,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    optionName: {
      type: String,
      default: undefined,
    },
    inlineRootAttr: {
      type: String,
      default: '',
    },
    optionsMenuClass: {
      type: String,
      default: '',
    },
    showActions: {
      type: Boolean,
      default: true,
    },
    showSearch: {
      type: Boolean,
      default: true,
    },
    actionsIconOnly: {
      type: Boolean,
      default: false,
    },
    selectAllLabel: {
      type: String,
      default: 'Zaznacz wszystko',
    },
    clearLabel: {
      type: String,
      default: 'Wyczysc',
    },
    emptyLabel: {
      type: String,
      default: 'Brak opcji',
    },
    showFooter: {
      type: Boolean,
      default: false,
    },
    renderShell: {
      type: Boolean,
      default: true,
    },
    cancelLabel: {
      type: String,
      default: 'Anuluj',
    },
    saveLabel: {
      type: String,
      default: 'Zapisz',
    },
    onSearchChange: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
    onSelectAll: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onClearAll: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onToggleValue: {
      type: Function as PropType<(optionValue: DataGridFilterOptionValue, checked: boolean) => void>,
      required: true,
    },
    onCancel: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onSave: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props) {
    const rootAttrs = () =>
      props.inlineRootAttr ? { [props.inlineRootAttr]: 'true' } : {}
    const stopClick = (event: MouseEvent) => event.stopPropagation()

    return () => {
      const content = (
        <>
        <div class="data-grid__filter-select-search-actions" {...rootAttrs()}>
        {props.showSearch ? (
          <input
            class="data-grid__filter-select-search"
            value={props.searchValue}
            placeholder={props.searchPlaceholder}
            {...rootAttrs()}
            onClick={stopClick}
            onInput={(event) => props.onSearchChange((event.target as HTMLInputElement).value)}
          />
        ) : null}
        {props.showActions ? (
          <div
            class={[
              'data-grid__filter-select-actions',
              !props.multiple ? 'data-grid__filter-select-actions--single' : '',
            ]}
            {...rootAttrs()}
          >
            {props.multiple ? (
              <button
                type="button"
                class="data-grid__filter-select-action"
                title={props.selectAllLabel}
                aria-label={props.selectAllLabel}
                {...rootAttrs()}
                onClick={(event) => {
                  event.stopPropagation()
                  props.onSelectAll?.()
                }}
              >
                {props.actionsIconOnly ? (
                  <span class="data-grid__filter-select-action-icon" aria-hidden="true">
                    ✓
                  </span>
                ) : (
                  props.selectAllLabel
                )}
              </button>
            ) : null}
            <button
              type="button"
              class="data-grid__filter-select-action"
              title={props.clearLabel}
              aria-label={props.clearLabel}
              {...rootAttrs()}
              onClick={(event) => {
                event.stopPropagation()
                props.onClearAll?.()
              }}
            >
              {props.actionsIconOnly ? (
                <span class="data-grid__filter-select-action-icon" aria-hidden="true">
                  ×
                </span>
              ) : (
                props.clearLabel
              )}
            </button>
          </div>
        ) : null}
        </div>
        <div
          class={['data-grid__filter-select-options', props.optionsMenuClass]}
          {...rootAttrs()}
        >
          {props.options.length > 0 ? (
            props.options.map((option) => {
              const optionKey = toDataGridSelectOptionKey(option.value)
              const selected = props.selectedValueKeys.has(optionKey)

              return (
                <label
                  key={optionKey}
                  class="data-grid__filter-select-option"
                  {...rootAttrs()}
                  onClick={stopClick}
                >
                  <input
                    class="data-grid__filter-select-native-control"
                    type={props.multiple ? 'checkbox' : 'radio'}
                    name={props.multiple ? undefined : props.optionName}
                    checked={selected}
                    {...rootAttrs()}
                    onChange={(event) =>
                      props.onToggleValue(option.value, (event.target as HTMLInputElement).checked)
                    }
                  />
                  <span
                    class={[
                      'data-grid__filter-select-control',
                      props.multiple
                        ? 'data-grid__filter-select-control--checkbox'
                        : 'data-grid__filter-select-control--radio',
                      selected ? 'data-grid__filter-select-control--checked' : '',
                    ]}
                    {...rootAttrs()}
                    aria-hidden="true"
                  />
                  <span>{option.label}</span>
                </label>
              )
            })
          ) : (
            <div class="data-grid__filter-select-empty" {...rootAttrs()}>
              {props.emptyLabel}
            </div>
          )}
        </div>
        {props.showFooter ? (
          <div class="data-grid__filter-select-footer" {...rootAttrs()}>
            <button
              type="button"
              class="data-grid__filter-select-action"
              {...rootAttrs()}
              onClick={(event) => {
                event.stopPropagation()
                props.onCancel?.()
              }}
            >
              {props.cancelLabel}
            </button>
            <button
              type="button"
              class="data-grid__filter-select-action data-grid__filter-select-action--primary"
              {...rootAttrs()}
              onClick={(event) => {
                event.stopPropagation()
                props.onSave?.()
              }}
            >
              {props.saveLabel}
            </button>
          </div>
        ) : null}
        </>
      )

      return props.renderShell ? (
        <div class="data-grid__filter-select-content" {...rootAttrs()}>{content}</div>
      ) : (
        content
      )
    }
  },
})
