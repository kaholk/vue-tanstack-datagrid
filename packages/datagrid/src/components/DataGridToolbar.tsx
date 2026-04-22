import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'
import type { DataGridFilterConfig, DataGridSavedView } from '../types'

type QuickFilterItem = {
  id: string
  width?: number | string
  config: DataGridFilterConfig
}

export default defineComponent({
  name: 'DataGridToolbar',
  props: {
    viewStorageKey: {
      type: String,
      default: '',
    },
    isViewsMenuOpen: {
      type: Boolean,
      required: true,
    },
    activeViewId: {
      type: String,
      required: true,
    },
    savedViews: {
      type: Array as PropType<DataGridSavedView[]>,
      required: true,
    },
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
    onToggleViewsMenu: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onSelectSavedView: {
      type: Function as PropType<(viewId: string) => void>,
      required: true,
    },
    onOpenSaveViewDialog: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onOverwriteActiveView: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onDeleteActiveView: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleFilterDialog: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onRefresh: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onClearFilters: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleColumnPicker: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <div class="data-grid__toolbar">
        {props.viewStorageKey ? (
          <div class="data-grid__views" data-grid-view-root="true">
            <button
              type="button"
              class="data-grid__toolbar-button"
              onClick={props.onToggleViewsMenu}
              data-grid-view-root="true"
            >
              Widoki
            </button>
            {props.isViewsMenuOpen ? (
              <DataGridDropdownMenu menuClass="data-grid__views-menu" scopeAttr="data-grid-view-root">
                <label class="data-grid__views-picker">
                  <span>Widok</span>
                  <select
                    value={props.activeViewId}
                    onChange={(event) =>
                      props.onSelectSavedView((event.target as HTMLSelectElement).value)
                    }
                  >
                    <option value="">Domyslny</option>
                    {props.savedViews.map((view) => (
                      <option key={view.id} value={view.id}>
                        {view.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div class="data-grid__views-actions">
                  <button
                    type="button"
                    class="data-grid__toolbar-button"
                    onClick={props.onOpenSaveViewDialog}
                    data-grid-view-root="true"
                  >
                    Zapisz
                  </button>
                  <button
                    type="button"
                    class="data-grid__toolbar-button"
                    onClick={props.onOverwriteActiveView}
                    disabled={!props.savedViews.length}
                    data-grid-view-root="true"
                  >
                    Nadpisz
                  </button>
                  <button
                    type="button"
                    class="data-grid__toolbar-button"
                    onClick={props.onDeleteActiveView}
                    disabled={!props.activeViewId}
                    data-grid-view-root="true"
                  >
                    Usun
                  </button>
                </div>
              </DataGridDropdownMenu>
            ) : null}
          </div>
        ) : null}

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

        <div class="data-grid__toolbar-actions" data-grid-dialog-root="true">
          <button
            type="button"
            class="data-grid__toolbar-button"
            onClick={props.onToggleFilterDialog}
            data-grid-dialog-root="true"
          >
            Filtry
          </button>
          <button
            type="button"
            class="data-grid__toolbar-button"
            onClick={props.onRefresh}
            data-grid-dialog-root="true"
          >
            Odswiez
          </button>
          <button
            type="button"
            class="data-grid__toolbar-button"
            onClick={props.onClearFilters}
            data-grid-dialog-root="true"
          >
            Wyczysc filtry
          </button>
          <button
            type="button"
            class="data-grid__toolbar-button"
            onClick={props.onToggleColumnPicker}
            data-grid-dialog-root="true"
          >
            Columns
          </button>
        </div>
      </div>
    )
  },
})
