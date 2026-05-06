import { ref, type ComputedRef, type Ref, type ShallowRef } from 'vue'
import type { Column, ColumnFiltersState, ColumnSort, PaginationState, Row, RowData } from '@tanstack/vue-table'
import ExcelExportWorker from '../workers/excelExportWorker?worker&inline'

import type {
  DataGridColumn,
  DataGridExcelExportConfig,
  DataGridExcelExportMode,
  DataGridFetchParams,
  DataGridFetchResult,
} from '../types'
import type { DataGridRequestState } from './useDataGridRows'
import {
  createExcelExportPayload,
  createExcelWorkbookFromPayload,
  downloadWorkbookBuffer,
  downloadWorkbook,
  prepareExcelExportRows,
  type DataGridExcelExportPayload,
  type DataGridExcelExportColumn,
  type DataGridExcelExportRow,
} from '../utils/excelExport'

type AnyRow = Record<string, unknown>

type UseDataGridExcelExportOptions<TData extends AnyRow> = {
  config: ComputedRef<DataGridExcelExportConfig<TData>>
  requestState: ShallowRef<DataGridRequestState<TData>>
  pagination: Ref<PaginationState>
  sorting: Ref<ColumnSort[]>
  columnFilters: Ref<ColumnFiltersState>
  globalFilter: Ref<string>
  visibleColumns: ComputedRef<Column<TData, unknown>[]>
  allLeafColumns: ComputedRef<Column<TData, unknown>[]>
  visibleRows: ComputedRef<Row<TData>[]>
  fetchPage: () => (params: DataGridFetchParams, signal?: AbortSignal) => Promise<DataGridFetchResult<TData>>
  renderColumnLabel: (column: Column<TData, unknown>) => string
}

const defaultExportConfig: Required<Pick<DataGridExcelExportConfig, 'sheetName' | 'pageSize' | 'maxRows' | 'useWorker' | 'valueBatchSize' | 'autoFilter' | 'freezeHeader' | 'includeActionColumns'>> = {
  sheetName: 'Dane',
  pageSize: 1000,
  maxRows: 50000,
  useWorker: true,
  valueBatchSize: 500,
  autoFilter: true,
  freezeHeader: true,
  includeActionColumns: false,
}

function getDefaultFileName(mode: DataGridExcelExportMode) {
  const date = new Date().toISOString().split('T')[0]
  return `export_${mode}_${date}.xlsx`
}

function isAllColumnsMode(mode: DataGridExcelExportMode) {
  return mode === 'all-columns-all-rows' || mode === 'all-columns-current-page'
}

function isAllRowsMode(mode: DataGridExcelExportMode) {
  return mode === 'view-all-rows' || mode === 'all-columns-all-rows'
}

function isExportableColumn<TData extends RowData>(
  columnDef: DataGridColumn<TData>,
  includeActionColumns: boolean,
) {
  if (columnDef.exportable === false) return false
  if (columnDef.localKind === 'action' && !includeActionColumns && columnDef.exportable !== true) {
    return false
  }
  return true
}

function collectServerFields<TData extends RowData>(columns: DataGridExcelExportColumn<TData>[]) {
  const fields = new Set<string>(['id'])

  for (const column of columns) {
    const columnDef = column.columnDef
    if (columnDef.serverField) fields.add(columnDef.serverField)
    for (const field of columnDef.requiredServerFields ?? []) {
      fields.add(field)
    }
  }

  return Array.from(fields).sort()
}

export function useDataGridExcelExport<TData extends AnyRow>(
  options: UseDataGridExcelExportOptions<TData>,
) {
  const exporting = ref(false)
  let workerRequestId = 0

  function resolveConfig(overrides: Partial<DataGridExcelExportConfig<TData>> = {}) {
    return {
      ...defaultExportConfig,
      ...options.config.value,
      ...overrides,
      styles: {
        ...(options.config.value.styles ?? {}),
        ...(overrides.styles ?? {}),
      },
    }
  }

  function getExportColumns(mode: DataGridExcelExportMode, config: DataGridExcelExportConfig<TData>) {
    const source = isAllColumnsMode(mode) ? options.allLeafColumns.value : options.visibleColumns.value

    return source
      .map<DataGridExcelExportColumn<TData>>((column) => ({
        id: column.id,
        label: options.renderColumnLabel(column),
        columnDef: column.columnDef as DataGridColumn<TData>,
        size: column.getSize(),
      }))
      .filter((column) => isExportableColumn(column.columnDef, config.includeActionColumns ?? false))
  }

  function getCurrentRows(): DataGridExcelExportRow<TData>[] {
    const rowById = new Map(options.visibleRows.value.map((row) => [row.id, row]))
    return options.requestState.value.rows.map((row, index) => {
      const rowInstance = rowById.get(String((row as { id?: unknown }).id ?? index))
      return rowInstance ? { original: row, row: rowInstance } : { original: row }
    })
  }

  async function fetchCurrentPageRows(columns: DataGridExcelExportColumn<TData>[]) {
    const response = await options.fetchPage()({
      pageIndex: options.pagination.value.pageIndex,
      pageSize: options.pagination.value.pageSize,
      sorting: options.sorting.value,
      filters: options.columnFilters.value,
      search: options.globalFilter.value.trim() || undefined,
      include_columns: collectServerFields(columns),
    })

    return response.rows.map((row) => ({ original: row }))
  }

  async function fetchAllRows(
    columns: DataGridExcelExportColumn<TData>[],
    config: ReturnType<typeof resolveConfig>,
  ) {
    const rows: DataGridExcelExportRow<TData>[] = []
    let pageIndex = 0
    let pageCount = 1

    while (pageIndex < pageCount) {
      const response = await options.fetchPage()({
        pageIndex,
        pageSize: config.pageSize,
        sorting: options.sorting.value,
        filters: options.columnFilters.value,
        search: options.globalFilter.value.trim() || undefined,
        include_columns: collectServerFields(columns),
      })

      if (response.totalRows > config.maxRows) {
        throw new Error(`Excel export row limit exceeded: ${response.totalRows}/${config.maxRows}.`)
      }

      rows.push(...response.rows.map((row) => ({ original: row })))
      if (rows.length > config.maxRows) {
        throw new Error(`Excel export row limit exceeded: ${rows.length}/${config.maxRows}.`)
      }

      pageCount = Math.max(1, response.pageCount)
      if (response.rows.length === 0) break
      pageIndex += 1
    }

    return rows
  }

  function resolveFileName(
    mode: DataGridExcelExportMode,
    config: DataGridExcelExportConfig<TData>,
    rowCount: number,
    columnCount: number,
  ) {
    const context = { mode, rowCount, columnCount }
    if (typeof config.fileName === 'function') return config.fileName(context)
    if (typeof config.fileName === 'string' && config.fileName.trim()) return config.fileName
    return getDefaultFileName(mode)
  }

  function canUseWorker(config: ReturnType<typeof resolveConfig>) {
    return config.useWorker && typeof Worker !== 'undefined'
  }

  function exportPayloadWithWorker(payload: DataGridExcelExportPayload) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const requestId = (workerRequestId += 1)
      const worker = new ExcelExportWorker()

      worker.onmessage = (
        event: MessageEvent<
          | { id: number; ok: true; buffer: ArrayBuffer }
          | { id: number; ok: false; error: string }
        >,
      ) => {
        if (event.data.id !== requestId) return
        worker.terminate()

        if (event.data.ok) {
          resolve(event.data.buffer)
          return
        }

        reject(new Error(event.data.error))
      }

      worker.onerror = (event) => {
        worker.terminate()
        reject(new Error(event.message || 'Excel export worker failed.'))
      }

      worker.postMessage({ id: requestId, payload })
    })
  }

  async function downloadWithWorkerFallback(
    payload: DataGridExcelExportPayload,
    fileName: string,
    config: ReturnType<typeof resolveConfig>,
  ) {
    if (canUseWorker(config)) {
      try {
        const buffer = await exportPayloadWithWorker(payload)
        downloadWorkbookBuffer(buffer, fileName)
        return
      } catch {
        // Fall back to the main thread when the browser or bundler cannot start the worker.
      }
    }

    const workbook = await createExcelWorkbookFromPayload(payload)
    await downloadWorkbook(workbook, fileName)
  }

  async function exportExcel(
    mode: DataGridExcelExportMode,
    overrides: Partial<DataGridExcelExportConfig<TData>> = {},
  ) {
    if (exporting.value) return

    const config = resolveConfig(overrides)
    const modes = config.modes
    if (modes && modes.length > 0 && !modes.includes(mode)) return

    exporting.value = true
    try {
      const columns = getExportColumns(mode, config)
      const rows = isAllRowsMode(mode)
        ? await fetchAllRows(columns, config)
        : mode === 'all-columns-current-page'
          ? await fetchCurrentPageRows(columns)
          : getCurrentRows()

      if (rows.length > config.maxRows) {
        throw new Error(`Excel export row limit exceeded: ${rows.length}/${config.maxRows}.`)
      }

      const fileName = resolveFileName(mode, config, rows.length, columns.length)
      const exportRows = await prepareExcelExportRows({
        columns,
        rows,
        batchSize: config.valueBatchSize,
      })
      const payload = createExcelExportPayload({
        columns,
        rows: exportRows,
        config,
      })

      await downloadWithWorkerFallback(payload, fileName, config)
    } catch (error) {
      config.onError?.(error)
      throw error
    } finally {
      exporting.value = false
    }
  }

  return {
    exporting,
    exportExcel,
  }
}
