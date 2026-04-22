import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'
import IconDeleteRounded from '~icons/material-symbols/delete-rounded'
import IconFilterAltOutline from '~icons/material-symbols/filter-alt-outline'
import IconRefreshRounded from '~icons/material-symbols/refresh-rounded'
import IconSaveRounded from '~icons/material-symbols/save-rounded'
import IconTuneRounded from '~icons/material-symbols/tune-rounded'
import IconViewColumnOutlineRounded from '~icons/material-symbols/view-column-outline-rounded'
import IconSaveAsOutlineSharp from '~icons/material-symbols/save-as-outline-sharp'

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
    activeFilterCount: {
      type: Number,
      default: 0,
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
              <IconTuneRounded class="data-grid__button-icon" />
              <span>Widoki</span>
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
                    <IconSaveRounded class="data-grid__button-icon" />
                    <span>Nowy</span>
                  </button>
                  <button
                    type="button"
                    class="data-grid__toolbar-button"
                    onClick={props.onOverwriteActiveView}
                    disabled={!props.savedViews.length}
                    data-grid-view-root="true"
                  >
                    <IconSaveAsOutlineSharp class="data-grid__button-icon" />
                    <span>Zapisz</span>
                  </button>
                  <button
                    type="button"
                    class="data-grid__toolbar-button"
                    onClick={props.onDeleteActiveView}
                    disabled={!props.activeViewId}
                    data-grid-view-root="true"
                  >
                    <IconDeleteRounded class="data-grid__button-icon" />
                    <span>Usuń</span>
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
          <div class="data-grid__toolbar-button-group" data-grid-dialog-root="true">
            <button
              type="button"
              class={[
                'data-grid__toolbar-button',
                props.activeFilterCount > 0 ? 'data-grid__toolbar-button--group-start' : '',
              ]}
              onClick={props.onToggleFilterDialog}
              data-grid-dialog-root="true"
            >
              <IconFilterAltOutline class="data-grid__button-icon" />
              <span>Filtry</span>
              {props.activeFilterCount > 0 ? (
                <span class="data-grid__badge">{props.activeFilterCount}</span>
              ) : null}
            </button>
            {props.activeFilterCount > 0 ? (
              <button
                type="button"
                class={[
                  'data-grid__toolbar-button',
                  'data-grid__toolbar-button--danger',
                  'data-grid__toolbar-button--icon-only',
                  'data-grid__toolbar-button--group-end',
                ]}
                onClick={props.onClearFilters}
                aria-label="Wyczysc filtry"
                title="Wyczysc filtry"
                data-grid-dialog-root="true"
              >
                <IconDeleteRounded class="data-grid__button-icon" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            class="data-grid__toolbar-button"
            onClick={props.onRefresh}
            data-grid-dialog-root="true"
          >
            <IconRefreshRounded class="data-grid__button-icon" />
            <span>Odswiez</span>
          </button>
          <button
            type="button"
            class="data-grid__toolbar-button"
            onClick={props.onToggleColumnPicker}
            data-grid-dialog-root="true"
          >
            <IconViewColumnOutlineRounded class="data-grid__button-icon" />
            <span>Kolumny</span>
          </button>
        </div>
      </div>
    )
  },
})
