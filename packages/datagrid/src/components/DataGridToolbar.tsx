import { defineComponent, type PropType, type VNodeChild } from 'vue'

import DataGridQuickFilters from './DataGridQuickFilters'
import DataGridToolbarActions from './DataGridToolbarActions'
import DataGridViewsMenu from './DataGridViewsMenu'
import type { DataGridExcelExportMode, DataGridFilterConfig, DataGridSavedView } from '../types'

type QuickFilterItem = {
  id: string
  width?: number | string
  config: DataGridFilterConfig
}

type ExcelExportAction = {
  mode: DataGridExcelExportMode
  label: string
}

export default defineComponent({
  name: 'DataGridToolbar',
  props: {
    showViews: {
      type: Boolean,
      default: false,
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
    hasPendingFilterChanges: {
      type: Boolean,
      default: false,
    },
    renderFilterControl: {
      type: Function as PropType<
        (config: DataGridFilterConfig, options?: { toolbar?: boolean; target?: 'live' | 'dialog' }) => VNodeChild
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
    onToggleFilterHelpDialog: {
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
    return () => (
      <div class="data-grid__toolbar">
        {props.showViews ? (
          <DataGridViewsMenu
            isOpen={props.isViewsMenuOpen}
            activeViewId={props.activeViewId}
            savedViews={props.savedViews}
            onToggle={props.onToggleViewsMenu}
            onSelect={props.onSelectSavedView}
            onCreate={props.onOpenSaveViewDialog}
            onOverwrite={props.onOverwriteActiveView}
            onDelete={props.onDeleteActiveView}
          />
        ) : null}

        <DataGridQuickFilters
          quickFilters={props.quickFilters}
          renderFilterControl={props.renderFilterControl}
        />

        <DataGridToolbarActions
          customActions={props.customActions}
          activeFilterCount={props.activeFilterCount}
          hasPendingFilterChanges={props.hasPendingFilterChanges}
          onToggleFilterDialog={props.onToggleFilterDialog}
          onToggleFilterHelpDialog={props.onToggleFilterHelpDialog}
          onRefresh={props.onRefresh}
          onClearFilters={props.onClearFilters}
          onApplyFilters={props.onApplyFilters}
          onResetFilterDraft={props.onResetFilterDraft}
          onToggleColumnPicker={props.onToggleColumnPicker}
          excelExportActions={props.excelExportActions}
          isExcelExporting={props.isExcelExporting}
          exportExcelLabel={props.exportExcelLabel}
          onExportExcel={props.onExportExcel}
        />
      </div>
    )
  },
})
