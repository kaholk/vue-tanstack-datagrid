import { computed, defineComponent, ref, type PropType, type VNodeChild } from 'vue'
import IconDeleteRounded from '~icons/material-symbols/delete-rounded'
import IconDownloadRounded from '~icons/material-symbols/download-rounded'
import IconFilterAltOutline from '~icons/material-symbols/filter-alt-outline'
import IconHelpOutlineRounded from '~icons/material-symbols/help-outline-rounded'
import IconRefreshRounded from '~icons/material-symbols/refresh-rounded'
import IconCheckRounded from '~icons/material-symbols/check-rounded'
import IconUndoRounded from '~icons/material-symbols/undo-rounded'
import IconViewColumnOutlineRounded from '~icons/material-symbols/view-column-outline-rounded'

import DataGridDropdownMenu from '../menus/DataGridDropdownMenu'
import type { DataGridExcelExportMode } from '../../types'

type ExcelExportAction = {
  mode: DataGridExcelExportMode
  label: string
}

export default defineComponent({
  name: 'DataGridToolbarActions',
  props: {
    activeFilterCount: {
      type: Number,
      default: 0,
    },
    hasPendingFilterChanges: {
      type: Boolean,
      default: false,
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
    onApplyFilters: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onResetFilterDraft: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleFilterHelpDialog: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleColumnPicker: {
      type: Function as PropType<() => void>,
      required: true,
    },
    excelExportActions: {
      type: Array as PropType<ExcelExportAction[]>,
      default: () => [],
    },
    isExcelExporting: {
      type: Boolean,
      default: false,
    },
    exportExcelLabel: {
      type: String,
      default: 'Excel',
    },
    onExportExcel: {
      type: Function as PropType<(mode: DataGridExcelExportMode) => void>,
      default: undefined,
    },
    customActions: {
      type: Array as PropType<VNodeChild[] | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const isExcelMenuOpen = ref(false)

    function toggleExcelMenu() {
      isExcelMenuOpen.value = !isExcelMenuOpen.value
    }

    function closeExcelMenu() {
      isExcelMenuOpen.value = false
    }

    function handleExport(mode: DataGridExcelExportMode) {
      closeExcelMenu()
      props.onExportExcel?.(mode)
    }

    const viewActions = computed(() => props.excelExportActions.filter((action) => action.mode.startsWith('view-')))
    const allActions = computed(() => props.excelExportActions.filter((action) => action.mode.startsWith('all-columns-')))
    const renderExcelAction = (action: ExcelExportAction) => {
      const Icon = action.mode.startsWith('all-columns-') ? IconViewColumnOutlineRounded : IconDownloadRounded

      return (
        <button
          key={action.mode}
          type="button"
          class="data-grid__menu-item data-grid__excel-menu-item"
          onClick={() => handleExport(action.mode)}
          data-grid-excel-root="true"
        >
          <Icon class="data-grid__menu-item-icon" />
          <span>{action.label}</span>
        </button>
      )
    }

    return () => (
      <div class="data-grid__toolbar-actions" data-grid-dialog-root="true">
        {props.customActions}
        {props.excelExportActions.length > 0 ? (
          <div class="data-grid__excel-export" data-grid-excel-root="true">
            <button
              type="button"
              class="data-grid__toolbar-button"
              onClick={toggleExcelMenu}
              disabled={props.isExcelExporting}
              data-grid-excel-root="true"
            >
              {props.isExcelExporting ? (
                <span class="data-grid__button-spinner" aria-hidden="true" />
              ) : (
                <IconDownloadRounded class="data-grid__button-icon" />
              )}
              <span>{props.isExcelExporting ? `${props.exportExcelLabel}...` : props.exportExcelLabel}</span>
            </button>
            {isExcelMenuOpen.value ? (
              <DataGridDropdownMenu
                menuClass="data-grid__excel-menu"
                scopeAttr="data-grid-excel-root"
                outsideClickRootAttr="data-grid-excel-root"
                onOutsidePointerDown={closeExcelMenu}
              >
                {viewActions.value.length > 0 ? (
                  <div class="data-grid__excel-menu-section">
                    <div class="data-grid__excel-menu-section-title">Widok</div>
                    {viewActions.value.map(renderExcelAction)}
                  </div>
                ) : null}
                {allActions.value.length > 0 ? (
                  <div class="data-grid__excel-menu-section">
                    <div class="data-grid__excel-menu-section-title">Wszystko</div>
                    {allActions.value.map(renderExcelAction)}
                  </div>
                ) : null}
              </DataGridDropdownMenu>
            ) : null}
          </div>
        ) : null}
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
        {props.hasPendingFilterChanges ? (
          <>
            <button
              type="button"
              class="data-grid__toolbar-button data-grid__toolbar-button--pending"
              onClick={props.onApplyFilters}
              data-grid-dialog-root="true"
            >
              <IconCheckRounded class="data-grid__button-icon" />
              <span>Zastosuj filtry</span>
            </button>
            <button
              type="button"
              class="data-grid__toolbar-button"
              onClick={props.onResetFilterDraft}
              data-grid-dialog-root="true"
            >
              <IconUndoRounded class="data-grid__button-icon" />
              <span>Cofnij zmiany</span>
            </button>
          </>
        ) : null}
        <button
          type="button"
          class="data-grid__toolbar-button data-grid__toolbar-button--icon-only"
          onClick={props.onToggleFilterHelpDialog}
          aria-label="Pomoc gridu"
          title="Pomoc gridu"
          data-grid-dialog-root="true"
        >
          <IconHelpOutlineRounded class="data-grid__button-icon" />
        </button>
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
    )
  },
})
