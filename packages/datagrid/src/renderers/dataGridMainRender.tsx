import type { ComputedRef, CSSProperties, Ref, ShallowRef, Slots, VNodeChild } from 'vue'
import type { Cell, Column, ColumnSizingState, Header, PaginationState, Row, Table } from '@tanstack/vue-table'
import type { VirtualItem } from '@tanstack/vue-virtual'
import DataGridBodyRow from '../components/DataGridBodyRow'
import DataGridColumnPickerDialog from '../components/DataGridColumnPickerDialog'
import DataGridFooter from '../components/DataGridFooter'
import DataGridFilterDialog from '../components/DataGridFilterDialog'
import DataGridHeaderCell from '../components/DataGridHeaderCell'
import DataGridHelpDialog from '../components/DataGridHelpDialog'
import DataGridSaveViewDialog from '../components/DataGridSaveViewDialog'
import DataGridSelectionPanel from '../components/DataGridSelectionPanel'
import DataGridToolbar from '../components/DataGridToolbar'
import { dataGridHeaderHeight } from '../dataGridDefaults'
import type { DataGridRequestState } from '../composables/useDataGridRows'
import type { RenderedSequenceItem } from '../composables/useDataGridVirtualization'
import type {
  DataGridColumn,
  DataGridColumnVisibilityState,
  DataGridExcelExportMode,
  DataGridFilterConfig,
  DataGridFloatingPosition,
  DataGridLocaleText,
  DataGridLoadingConfig,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridQuickFilterConfig,
  DataGridSavedView,
  DataGridSelectionPanelConfig,
  DataGridSelectionPanelPosition,
} from '../types'
import type { AnyRow, FilterDialogSection, SelectionPanelSection, SelectionPreviewMode } from '../types/internal'
import { buildPaginationItems } from '../utils/pagination'

type RefLike<T> = Ref<T> | ComputedRef<T> | ShallowRef<T>
type ExcelExportAction = {
  mode: DataGridExcelExportMode
  label: string
}
type SelectionPanelAction = {
  id: string
  label: string
  title?: string
  disabled?: boolean
  onClick: () => void | Promise<void>
}

export type DataGridMainRenderContext = {
  requestState: RefLike<DataGridRequestState<AnyRow>>
  pagination: Ref<PaginationState>
  isAutoHeight: RefLike<boolean>
  showViewsMenu: RefLike<boolean>
  isViewsMenuOpen: Ref<boolean>
  activeViewId: RefLike<string>
  savedViews: RefLike<DataGridSavedView[]>
  quickFilterConfigs: RefLike<Array<DataGridQuickFilterConfig & { config: DataGridFilterConfig }>>
  activeFilterCount: RefLike<number>
  renderFilterControl: (config: DataGridFilterConfig, options?: { toolbar?: boolean; target?: 'live' | 'dialog' }) => VNodeChild
  toggleViewsMenu: () => void
  selectSavedView: (viewId: string) => void | Promise<void>
  openSaveViewDialog: () => void
  overwriteActiveView: () => void | Promise<void>
  deleteActiveView: () => void | Promise<void>
  toggleFilterDialog: () => void
  toggleFilterHelpDialog: () => void
  refreshData: () => void
  clearAllFilters: () => void
  toggleColumnPicker: () => void
  excelExportActions: RefLike<ExcelExportAction[]>
  isExcelExporting: Ref<boolean>
  localeText: RefLike<Required<DataGridLocaleText>>
  handleExportExcel: (mode: DataGridExcelExportMode) => void | Promise<void>
  slots: Slots
  effectiveHeight: RefLike<number | string>
  scrollElementRef: Ref<HTMLDivElement | null>
  isLoading: Ref<boolean>
  mergedLoadingConfig: RefLike<DataGridLoadingConfig>
  totalWidth: RefLike<number>
  totalRowHeight: RefLike<number>
  headerSequence: RefLike<Array<RenderedSequenceItem<Header<AnyRow, unknown>>>>
  getPinnedSide: (columnId: string) => 'left' | 'right' | false
  cellStylesByColumnId: RefLike<Map<string, CSSProperties>>
  columnPickerLabelById: RefLike<Map<string, string>>
  columnMenuStyleById: RefLike<Map<string, CSSProperties>>
  openMenuColumnId: Ref<string | null>
  getColumnFilterConfig: (column: Column<AnyRow, unknown>) => DataGridFilterConfig
  toggleColumnMenu: (columnId: string) => void
  toggleSorting: (column: Column<AnyRow, unknown>) => void
  setSortDesc: (column: Column<AnyRow, unknown>) => void
  clearSorting: (column: Column<AnyRow, unknown>) => void
  setPin: (column: Column<AnyRow, unknown>, side: 'left' | 'right' | false) => void
  closeColumnMenu: () => void
  virtualRows: RefLike<VirtualItem[]>
  visibleRows: RefLike<Array<Row<AnyRow>>>
  previewSelectionRowIds: ShallowRef<Set<string>>
  rowSelectionPreviewMode: Ref<SelectionPreviewMode>
  rowSequence: RefLike<Array<RenderedSequenceItem<Column<AnyRow, unknown>>>>
  visibleColumnIndexById: RefLike<Map<string, number>>
  renderCell: (cell: Cell<AnyRow, unknown>) => VNodeChild
  isCellSelectionEnabled: RefLike<boolean>
  isCellSelected: (cell: Cell<AnyRow, unknown>) => boolean
  isCellSelectionHovered: (cell: Cell<AnyRow, unknown>) => boolean
  getCellSelectionPreviewMode: (cell: Cell<AnyRow, unknown>) => SelectionPreviewMode
  handleCellSelectionPointerEnter: (cell: Cell<AnyRow, unknown>, event: PointerEvent) => void
  handleCellSelectionPointerLeave: (cell: Cell<AnyRow, unknown>, event: PointerEvent) => void
  handleCellSelectionClick: (cell: Cell<AnyRow, unknown>, event: MouseEvent) => boolean | void
  mergedSelectionPanelConfig: RefLike<DataGridSelectionPanelConfig<AnyRow> | null>
  selectionPanelSections: RefLike<SelectionPanelSection[]>
  selectionPanelPosition: Ref<DataGridSelectionPanelPosition>
  selectionPanelFloatingPosition: Ref<DataGridFloatingPosition>
  selectionPanelSelectedCount: RefLike<number>
  selectionPanelActions: RefLike<SelectionPanelAction[]>
  selectionPanelSums: RefLike<Array<{ columnId: string; label: string; value: string }>>
  copyAllSelection: (includeHeaders: boolean) => void | Promise<void>
  clearAllSelection: () => void
  updateSelectionPanelPosition: (position: DataGridSelectionPanelPosition) => void
  updateSelectionPanelFloatingPosition: (position: DataGridFloatingPosition) => void
  effectiveMetaItems: RefLike<DataGridMetaConfig[]>
  effectivePageSizeConfig: RefLike<DataGridPageSizeConfig>
  table: Table<AnyRow>
  serverFilterColumns: RefLike<Array<Column<AnyRow, unknown>>>
  errorMessage: Ref<string>
  isFilterDialogOpen: Ref<boolean>
  filterDialogSections: RefLike<FilterDialogSection[]>
  closeFilterDialog: () => void
  applyFilterDialogChanges: () => void
  isFilterHelpDialogOpen: Ref<boolean>
  isColumnPickerOpen: Ref<boolean>
  columnPickerColumns: RefLike<Array<Column<AnyRow, unknown>>>
  renderColumnPickerLabel: (column: Column<AnyRow, unknown>) => string
  draftColumnVisibility: Ref<DataGridColumnVisibilityState>
  getDraftPinnedSide: (columnId: string) => 'left' | 'right' | false
  draftColumnSizing: Ref<ColumnSizingState>
  allLeafColumnsById: RefLike<Map<string, Column<AnyRow, unknown>>>
  getDraftColumnMoveTarget: (columnId: string) => string
  closeColumnPicker: () => void
  applyColumnDialogChanges: () => void
  toggleDraftColumnVisibility: (columnId: string, isVisible: boolean) => void
  updateDraftColumnSize: (columnId: string, rawValue: string) => void
  setDraftPin: (columnId: string, side: 'left' | 'right' | false) => void
  moveDraftColumn: (columnId: string, direction: -1 | 1) => void
  updateDraftColumnMoveTarget: (columnId: string, targetColumnId: string) => void
  moveDraftColumnRelative: (columnId: string, targetColumnId: string, position: 'before' | 'after') => void
  isSaveViewDialogOpen: Ref<boolean>
  newViewName: Ref<string>
  closeSaveViewDialog: () => void
  saveNewView: () => void
}

function renderColumnPickerDialog(context: DataGridMainRenderContext) {
  if (!context.isColumnPickerOpen.value) {
    return null
  }

  return (
    <DataGridColumnPickerDialog
      isOpen={context.isColumnPickerOpen.value}
      columns={context.columnPickerColumns.value}
      renderColumnLabel={context.renderColumnPickerLabel}
      getIsColumnVisible={(columnId) => context.draftColumnVisibility.value[columnId] ?? true}
      getPinnedSide={context.getDraftPinnedSide}
      getColumnSize={(columnId) => {
        const column = context.allLeafColumnsById.value.get(columnId)
        return context.draftColumnSizing.value[columnId] ?? column?.getSize() ?? 160
      }}
      getColumnMoveTarget={context.getDraftColumnMoveTarget}
      onClose={context.closeColumnPicker}
      onApply={context.applyColumnDialogChanges}
      onToggleColumnVisibility={context.toggleDraftColumnVisibility}
      onUpdateColumnSize={context.updateDraftColumnSize}
      onSetPin={context.setDraftPin}
      onMoveColumn={context.moveDraftColumn}
      onUpdateColumnMoveTarget={context.updateDraftColumnMoveTarget}
      onMoveColumnRelative={context.moveDraftColumnRelative}
    />
  )
}

function renderFilterDialog(context: DataGridMainRenderContext) {
  if (!context.isFilterDialogOpen.value) {
    return null
  }

  return <DataGridFilterDialog isOpen={context.isFilterDialogOpen.value} sections={context.filterDialogSections.value} renderFilterControl={(config) => context.renderFilterControl(config, { target: 'dialog' })} onClose={context.closeFilterDialog} onApply={context.applyFilterDialogChanges} />
}

function renderFilterHelpDialog(context: DataGridMainRenderContext) {
  if (!context.isFilterHelpDialogOpen.value) {
    return null
  }

  return (
    <DataGridHelpDialog
      isOpen={context.isFilterHelpDialogOpen.value}
      onClose={() => {
        context.isFilterHelpDialogOpen.value = false
      }}
    />
  )
}

function renderSaveViewDialog(context: DataGridMainRenderContext) {
  if (!context.isSaveViewDialogOpen.value) {
    return null
  }

  return (
    <DataGridSaveViewDialog
      isOpen={context.isSaveViewDialogOpen.value}
      viewName={context.newViewName.value}
      onClose={context.closeSaveViewDialog}
      onSave={context.saveNewView}
      onUpdateViewName={(value) => {
        context.newViewName.value = value
      }}
    />
  )
}

export function renderDataGridMain(context: DataGridMainRenderContext) {
  const pageCount = context.requestState.value.pageCount
  const pageIndex = context.pagination.value.pageIndex
  const paginationItems = buildPaginationItems(pageCount, pageIndex)

  return (
    <section
      class={['data-grid', context.isAutoHeight.value ? 'data-grid--fill-height' : '']}
    >
      <div class="data-grid__table-shell">
        <div>
          <DataGridToolbar
            showViews={context.showViewsMenu.value}
            isViewsMenuOpen={context.isViewsMenuOpen.value}
            activeViewId={context.activeViewId.value}
            savedViews={context.savedViews.value}
            quickFilters={context.quickFilterConfigs.value}
            activeFilterCount={context.activeFilterCount.value}
            renderFilterControl={context.renderFilterControl}
            onToggleViewsMenu={context.toggleViewsMenu}
            onSelectSavedView={context.selectSavedView}
            onOpenSaveViewDialog={context.openSaveViewDialog}
            onOverwriteActiveView={() => {
              void context.overwriteActiveView()
            }}
            onDeleteActiveView={() => {
              void context.deleteActiveView()
            }}
            onToggleFilterDialog={context.toggleFilterDialog}
            onToggleFilterHelpDialog={context.toggleFilterHelpDialog}
            onRefresh={context.refreshData}
            onClearFilters={context.clearAllFilters}
            onToggleColumnPicker={context.toggleColumnPicker}
            excelExportActions={context.excelExportActions.value}
            isExcelExporting={context.isExcelExporting.value}
            exportExcelLabel={context.localeText.value.exportExcelLabel}
            onExportExcel={(mode) => {
              void context.handleExportExcel(mode)
            }}
            customActions={context.slots['toolbar-actions']?.()}
          />
        </div>

        <div
          class="data-grid__viewport-shell"
          style={
            {
              ...(context.isAutoHeight.value ? {} : { height: `${context.effectiveHeight.value}px` }),
              '--data-grid-header-height': `${dataGridHeaderHeight}px`,
            } as Record<string, string>
          }
        >
          <div ref={context.scrollElementRef} class={['data-grid__viewport', context.isLoading.value && context.mergedLoadingConfig.value.variant === 'overlay' ? 'data-grid__viewport--loading' : '']}>
            <div
              class="data-grid__inner"
              style={{
                width: `${context.totalWidth.value}px`,
                height: `${context.totalRowHeight.value + dataGridHeaderHeight}px`,
              }}
            >
              <div class="data-grid__header" style={{ width: `${context.totalWidth.value}px` }}>
                <div class="data-grid__row data-grid__row--header" style={{ transform: 'translateY(0px)' }}>
                  {context.headerSequence.value.map((entry) => {
                    if (entry.type === 'spacer') {
                      return <div key={entry.key} class="data-grid__cell-spacer" style={{ width: `${entry.width}px` }} />
                    }

                    const pinnedSide = context.getPinnedSide(entry.column.id)

                    return (
                      <div
                        key={entry.key}
                        class={['data-grid__cell', 'data-grid__cell--header', pinnedSide ? 'data-grid__cell--pinned' : '', pinnedSide ? `data-grid__cell--${pinnedSide}` : '']}
                        style={context.cellStylesByColumnId.value.get(entry.column.id)}
                      >
                        <DataGridHeaderCell header={entry.item.getContext()} column={entry.column} pickerLabel={context.columnPickerLabelById.value.get(entry.column.id) ?? entry.column.id} justifyContent={(context.cellStylesByColumnId.value.get(entry.column.id)?.justifyContent as string) ?? 'flex-start'} menuStyle={context.columnMenuStyleById.value.get(entry.column.id) ?? { left: '0', right: 'auto' }} isMenuOpen={context.openMenuColumnId.value === entry.column.id} pinnedSide={pinnedSide} renderFilterControl={(config) => context.renderFilterControl(config)} getColumnFilterConfig={context.getColumnFilterConfig} onToggleMenu={context.toggleColumnMenu} onToggleSorting={context.toggleSorting} onSetSortDesc={context.setSortDesc} onClearSorting={context.clearSorting} onSetPin={context.setPin} onCloseMenu={context.closeColumnMenu} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div class="data-grid__body" style={{ width: `${context.totalWidth.value}px` }}>
                {context.virtualRows.value.map((virtualRow) => {
                  const row = context.visibleRows.value[virtualRow.index]
                  if (!row) {
                    return null
                  }

                  const rowPreviewMode = context.previewSelectionRowIds.value.has(row.id)
                    ? context.rowSelectionPreviewMode.value
                    : null

                  return (
                    <DataGridBodyRow key={row.id} row={row} rowStart={virtualRow.start} rowSize={virtualRow.size} rowSequence={context.rowSequence.value} visibleColumnIndexById={context.visibleColumnIndexById.value} cellStylesByColumnId={context.cellStylesByColumnId.value} getPinnedSide={context.getPinnedSide} renderCell={context.renderCell} isSelectionPreviewed={rowPreviewMode === 'select'} isSelectionRevertPreviewed={rowPreviewMode === 'deselect'} enableCellSelection={context.isCellSelectionEnabled.value} isCellSelected={context.isCellSelectionEnabled.value ? context.isCellSelected : undefined} isCellSelectionHovered={context.isCellSelectionEnabled.value ? context.isCellSelectionHovered : undefined} getCellSelectionPreviewMode={context.isCellSelectionEnabled.value ? context.getCellSelectionPreviewMode : undefined} onCellSelectionPointerEnter={context.isCellSelectionEnabled.value ? context.handleCellSelectionPointerEnter : undefined} onCellSelectionPointerLeave={context.isCellSelectionEnabled.value ? context.handleCellSelectionPointerLeave : undefined} onCellSelectionClick={context.isCellSelectionEnabled.value ? context.handleCellSelectionClick : undefined} />
                  )
                })}
              </div>
            </div>
          </div>
          {context.isLoading.value && context.mergedLoadingConfig.value.variant === 'overlay' ? (
            <div class="data-grid__loading-overlay" aria-live="polite">
              <div class="data-grid__loading-spinner" />
              <span class="data-grid__loading-label">{context.mergedLoadingConfig.value.label ?? 'Ladowanie danych'}</span>
            </div>
          ) : null}
        </div>
        {context.mergedSelectionPanelConfig.value && context.selectionPanelSections.value.length > 0 ? (
          <DataGridSelectionPanel
            position={context.mergedSelectionPanelConfig.value.position ?? context.selectionPanelPosition.value ?? 'bottom-right'}
            floatingPosition={context.mergedSelectionPanelConfig.value.floatingPosition ?? context.selectionPanelFloatingPosition.value ?? null}
            selectedRowsCount={context.selectionPanelSelectedCount.value}
            selectedRowsLabel={context.localeText.value.selectedRowsTotalLabel}
            sections={context.selectionPanelSections.value}
            actions={context.selectionPanelActions.value}
            sums={context.selectionPanelSums.value}
            copyLabel={context.localeText.value.copyAllLabel}
            copyIncludeHeaders={context.mergedSelectionPanelConfig.value.copyIncludeHeaders ?? false}
            copyWithHeadersLabel={context.mergedSelectionPanelConfig.value.copyWithHeadersLabel ?? context.localeText.value.copyWithHeadersLabel}
            copyWithoutHeadersLabel={context.mergedSelectionPanelConfig.value.copyWithoutHeadersLabel ?? context.localeText.value.copyWithoutHeadersLabel}
            allowPositionChange={context.mergedSelectionPanelConfig.value.allowPositionChange ?? true}
            onCopy={(options) => {
              void context.copyAllSelection(options.includeHeaders)
            }}
            onClearSelection={context.clearAllSelection}
            onUpdatePosition={context.updateSelectionPanelPosition}
            onUpdateFloatingPosition={context.updateSelectionPanelFloatingPosition}
          />
        ) : null}

        <div>
          <DataGridFooter
            isLoading={context.isLoading.value}
            totalRows={context.requestState.value.totalRows}
            fetchedRows={context.requestState.value.rows.length}
            datasetSize={typeof context.requestState.value.meta?.datasetSize === 'string' || typeof context.requestState.value.meta?.datasetSize === 'number' ? context.requestState.value.meta.datasetSize : undefined}
            metaItems={context.effectiveMetaItems.value}
            pageSizeConfig={context.effectivePageSizeConfig.value}
            pageIndex={pageIndex}
            pageSize={context.pagination.value.pageSize}
            paginationItems={paginationItems}
            canPreviousPage={context.table.getCanPreviousPage()}
            canNextPage={context.table.getCanNextPage()}
            onPreviousPage={() => context.table.previousPage()}
            onNextPage={() => context.table.nextPage()}
            onSetPageIndex={(nextPageIndex) => context.table.setPageIndex(nextPageIndex)}
            onPageSizeChange={(pageSize) => {
              context.pagination.value = {
                pageIndex: 0,
                pageSize,
              }
            }}
          />
        </div>
      </div>

      {context.serverFilterColumns.value.length === 0 ? <p class="data-grid__note">{context.localeText.value.noFilterableColumnsMessage}</p> : null}
      {context.errorMessage.value ? <p class="data-grid__error">{context.errorMessage.value}</p> : null}
      {renderFilterDialog(context)}
      {renderFilterHelpDialog(context)}
      {renderColumnPickerDialog(context)}
      {renderSaveViewDialog(context)}
    </section>
  )
}
