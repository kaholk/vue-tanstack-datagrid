import type ExcelJS from 'exceljs'
import type { Row, RowData } from '@tanstack/vue-table'

import type {
  DataGridColumn,
  DataGridColumnAlign,
  DataGridExcelCellStyle,
  DataGridExcelExportConfig,
  DataGridExcelExportFormat,
  DataGridValueContext,
} from '../types'

type AnyRow = Record<string, unknown>

export type DataGridExcelExportColumn<TData extends RowData = AnyRow> = {
  id: string
  label: string
  columnDef: DataGridColumn<TData>
  size: number
}

export type DataGridExcelExportRow<TData extends RowData = AnyRow> = {
  original: TData
  row?: Row<TData>
}

export type DataGridExcelExportPayloadColumn = {
  id: string
  header: string
  width: number
  explicitWidth?: boolean
  format?: DataGridExcelExportFormat
  align?: DataGridColumnAlign
}

export type DataGridExcelExportPayload = {
  sheetName: string
  columns: DataGridExcelExportPayloadColumn[]
  rows: Record<string, unknown>[]
  styles?: DataGridExcelExportConfig['styles']
  autoFilter: boolean
  freezeHeader: boolean
}

type ExcelJSImport = typeof import('exceljs')

const defaultHeaderStyle: DataGridExcelCellStyle = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } },
  alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
  border: { bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } } },
}

const defaultDataStyle: DataGridExcelCellStyle = {
  alignment: { vertical: 'middle' },
}

export async function loadExcelJS(): Promise<ExcelJSImport> {
  const module = await import('exceljs')
  if (module.Workbook) return module
  if (module.default?.Workbook) return module.default as ExcelJSImport
  throw new Error('Could not load ExcelJS Workbook.')
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  downloadWorkbookBuffer(buffer, fileName)
}

export function downloadWorkbookBuffer(buffer: BlobPart, fileName: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  link.click()
  window.URL.revokeObjectURL(url)
}

export function getExportFormatNumFmt(format: DataGridExcelExportFormat | undefined) {
  if (!format) return undefined
  if (typeof format === 'object') return format.numFmt
  if (format === 'number') return '#,##0.00'
  if (format === 'accounting') return '#,##0.00;[Red]-#,##0.00;-'
  if (format === 'date') return 'yyyy-mm-dd'
  if (format === 'datetime') return 'yyyy-mm-dd hh:mm'
  return undefined
}

export function normalizeExcelValue(
  value: unknown,
  format: DataGridExcelExportFormat | undefined,
): unknown {
  if (value === null || value === undefined) return ''
  if (format === 'text') return String(value)

  if (format === 'number' || format === 'accounting' || (typeof format === 'object' && format.numFmt)) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : ''
    if (typeof value === 'string') {
      const normalized = Number(value.replace(/\s/g, '').replace(',', '.'))
      return Number.isFinite(normalized) ? normalized : value
    }
  }

  if (format === 'date' || format === 'datetime') {
    if (value instanceof Date) return value
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'name' in item) {
          return String((item as { name?: unknown }).name ?? '')
        }
        return String(item ?? '')
      })
      .filter(Boolean)
      .join(', ')
  }

  if (typeof value === 'boolean') return value ? 'Tak' : 'Nie'
  return value
}

function getRawValue<TData extends RowData>(
  row: DataGridExcelExportRow<TData>,
  column: DataGridExcelExportColumn<TData>,
) {
  const columnDef = column.columnDef

  if (row.row) {
    try {
      return row.row.getValue(column.id)
    } catch {
      return undefined
    }
  }

  const accessorKey = (columnDef as { accessorKey?: unknown }).accessorKey
  if (typeof accessorKey === 'string') {
    return (row.original as Record<string, unknown>)[accessorKey]
  }

  return (row.original as Record<string, unknown>)[column.id]
}

function createValueContext<TData extends RowData>(
  row: DataGridExcelExportRow<TData>,
  column: DataGridExcelExportColumn<TData>,
): DataGridValueContext<TData> {
  if (row.row) {
    const cell = row.row.getAllCells().find((item) => item.column.id === column.id) ?? row.row.getAllCells()[0]
    return {
      cell: cell as DataGridValueContext<TData>['cell'],
      row: row.row,
    }
  }

  const fakeRow = {
    original: row.original,
    getValue: (columnId: string) => (row.original as Record<string, unknown>)[columnId],
  }

  return {
    cell: undefined as unknown as DataGridValueContext<TData>['cell'],
    row: fakeRow as DataGridValueContext<TData>['row'],
  }
}

export function resolveExportCellValue<TData extends RowData>(
  row: DataGridExcelExportRow<TData>,
  column: DataGridExcelExportColumn<TData>,
) {
  const columnDef = column.columnDef
  const context = createValueContext(row, column)
  const rawValue = columnDef.exportValue
    ? columnDef.exportValue(context)
    : columnDef.clipboardValue
      ? columnDef.clipboardValue(context)
      : getRawValue(row, column)
  return normalizeExcelValue(rawValue, columnDef.exportFormat)
}

function applyStyle(cell: ExcelJS.Cell, style: DataGridExcelCellStyle | undefined) {
  if (!style) return
  if (style.font) cell.font = style.font as Partial<ExcelJS.Font>
  if (style.fill) cell.fill = style.fill as unknown as ExcelJS.Fill
  if (style.alignment) cell.alignment = style.alignment as Partial<ExcelJS.Alignment>
  if (style.border) cell.border = style.border as Partial<ExcelJS.Borders>
}

function getHorizontalAlign(align: DataGridColumnAlign | undefined) {
  if (align === 'center') return 'center'
  if (align === 'end') return 'right'
  return 'left'
}

function getInitialColumnWidth<TData extends RowData>(
  column: DataGridExcelExportColumn<TData> | DataGridExcelExportPayloadColumn,
) {
  if ('columnDef' in column) {
    return Math.max(10, Math.min(80, Math.round((column.columnDef.exportWidth ?? column.size) / 8)))
  }

  return column.width
}

function getColumnHeader<TData extends RowData>(
  column: DataGridExcelExportColumn<TData> | DataGridExcelExportPayloadColumn,
) {
  if ('columnDef' in column) return column.columnDef.exportHeader ?? column.label
  return column.header
}

function getColumnFormat<TData extends RowData>(
  column: DataGridExcelExportColumn<TData> | DataGridExcelExportPayloadColumn,
) {
  if ('columnDef' in column) return column.columnDef.exportFormat
  return column.format
}

function getColumnAlign<TData extends RowData>(
  column: DataGridExcelExportColumn<TData> | DataGridExcelExportPayloadColumn,
) {
  if ('columnDef' in column) return column.columnDef.exportAlign ?? column.columnDef.align
  return column.align
}

function hasExplicitColumnWidth<TData extends RowData>(
  column: DataGridExcelExportColumn<TData> | DataGridExcelExportPayloadColumn,
) {
  if ('columnDef' in column) return Boolean(column.columnDef.exportWidth)
  return Boolean(column.explicitWidth)
}

async function createWorkbookFromValues<TData extends RowData = AnyRow>(options: {
  sheetName: string
  columns: Array<DataGridExcelExportColumn<TData> | DataGridExcelExportPayloadColumn>
  rows: Record<string, unknown>[]
  styles?: DataGridExcelExportConfig['styles']
  autoFilter: boolean
  freezeHeader: boolean
}) {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.sheetName)
  const headerStyle = {
    ...defaultHeaderStyle,
    ...(options.styles?.header ?? {}),
  }
  const dataStyle = {
    ...defaultDataStyle,
    ...(options.styles?.data ?? {}),
  }

  worksheet.columns = options.columns.map((column) => ({
    header: getColumnHeader(column),
    key: column.id,
    width: getInitialColumnWidth(column),
  }))

  const headerRow = worksheet.getRow(1)
  headerRow.height = 22
  headerRow.eachCell((cell) => applyStyle(cell, headerStyle))

  for (const row of options.rows) worksheet.addRow(row)

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.eachCell((cell, columnIndex) => {
      const exportColumn = options.columns[columnIndex - 1]
      if (!exportColumn) return
      applyStyle(cell, {
        ...dataStyle,
        alignment: {
          ...(dataStyle.alignment ?? {}),
          horizontal: getHorizontalAlign(getColumnAlign(exportColumn)),
        },
      })
    })
  })

  options.columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1)
    const numFmt = getExportFormatNumFmt(getColumnFormat(column))
    if (numFmt) excelColumn.numFmt = numFmt

    if (hasExplicitColumnWidth(column)) {
      excelColumn.width = getInitialColumnWidth(column)
      return
    }

    let maxLength = String(getColumnHeader(column)).length
    excelColumn.eachCell({ includeEmpty: false }, (cell) => {
      const text = cell.value instanceof Date ? 'yyyy-mm-dd hh:mm' : String(cell.value ?? '')
      maxLength = Math.max(maxLength, text.length)
    })
    excelColumn.width = Math.max(excelColumn.width ?? 10, Math.min(80, maxLength + 2))
  })

  if (options.autoFilter && options.columns.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: options.columns.length },
    }
  }

  if (options.freezeHeader) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  return workbook
}

export async function createExcelWorkbook<TData extends RowData>(options: {
  columns: DataGridExcelExportColumn<TData>[]
  rows: DataGridExcelExportRow<TData>[]
  config: Required<Pick<DataGridExcelExportConfig<TData>, 'sheetName' | 'autoFilter' | 'freezeHeader'>> & DataGridExcelExportConfig<TData>
}) {
  return createWorkbookFromValues({
    sheetName: options.config.sheetName,
    columns: options.columns,
    rows: await prepareExcelExportRows({
      columns: options.columns,
      rows: options.rows,
      batchSize: options.config.valueBatchSize,
    }),
    styles: options.config.styles,
    autoFilter: options.config.autoFilter,
    freezeHeader: options.config.freezeHeader,
  })
}

export function createExcelExportPayload<TData extends RowData>(options: {
  columns: DataGridExcelExportColumn<TData>[]
  rows: Record<string, unknown>[]
  config: Required<Pick<DataGridExcelExportConfig<TData>, 'sheetName' | 'autoFilter' | 'freezeHeader'>> & DataGridExcelExportConfig<TData>
}): DataGridExcelExportPayload {
  return {
    sheetName: options.config.sheetName,
    columns: options.columns.map((column) => ({
      id: column.id,
      header: String(column.columnDef.exportHeader ?? column.label),
      width: getInitialColumnWidth(column),
      explicitWidth: Boolean(column.columnDef.exportWidth),
      format: column.columnDef.exportFormat,
      align: column.columnDef.exportAlign ?? column.columnDef.align,
    })),
    rows: options.rows,
    styles: options.config.styles,
    autoFilter: options.config.autoFilter,
    freezeHeader: options.config.freezeHeader,
  }
}

export async function createExcelWorkbookFromPayload(payload: DataGridExcelExportPayload) {
  return createWorkbookFromValues(payload)
}

export async function createExcelWorkbookBufferFromPayload(payload: DataGridExcelExportPayload) {
  const workbook = await createExcelWorkbookFromPayload(payload)
  return workbook.xlsx.writeBuffer()
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }

    setTimeout(resolve, 0)
  })
}

export async function prepareExcelExportRows<TData extends RowData>(options: {
  columns: DataGridExcelExportColumn<TData>[]
  rows: DataGridExcelExportRow<TData>[]
  batchSize?: number
}) {
  const batchSize = Math.max(1, options.batchSize ?? 500)
  const exportRows: Record<string, unknown>[] = []

  for (let rowIndex = 0; rowIndex < options.rows.length; rowIndex += 1) {
    const row = options.rows[rowIndex]
    if (!row) continue
    const values: Record<string, unknown> = {}
    for (const column of options.columns) {
      values[column.id] = resolveExportCellValue(row, column)
    }
    exportRows.push(values)

    if ((rowIndex + 1) % batchSize === 0) {
      await yieldToBrowser()
    }
  }

  return exportRows
}
