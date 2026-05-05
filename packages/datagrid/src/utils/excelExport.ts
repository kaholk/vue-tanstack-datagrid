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

export async function createExcelWorkbook<TData extends RowData>(options: {
  columns: DataGridExcelExportColumn<TData>[]
  rows: DataGridExcelExportRow<TData>[]
  config: Required<Pick<DataGridExcelExportConfig<TData>, 'sheetName' | 'autoFilter' | 'freezeHeader'>> & DataGridExcelExportConfig<TData>
}) {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(options.config.sheetName)
  const headerStyle = {
    ...defaultHeaderStyle,
    ...(options.config.styles?.header ?? {}),
  }
  const dataStyle = {
    ...defaultDataStyle,
    ...(options.config.styles?.data ?? {}),
  }

  worksheet.columns = options.columns.map((column) => ({
    header: column.columnDef.exportHeader ?? column.label,
    key: column.id,
    width: Math.max(10, Math.min(80, Math.round((column.columnDef.exportWidth ?? column.size) / 8))),
  }))

  const headerRow = worksheet.getRow(1)
  headerRow.height = 22
  headerRow.eachCell((cell) => applyStyle(cell, headerStyle))

  for (const row of options.rows) {
    const values: Record<string, unknown> = {}
    for (const column of options.columns) {
      values[column.id] = resolveExportCellValue(row, column)
    }
    worksheet.addRow(values)
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.eachCell((cell, columnIndex) => {
      const exportColumn = options.columns[columnIndex - 1]
      const align = exportColumn?.columnDef.exportAlign ?? exportColumn?.columnDef.align
      applyStyle(cell, {
        ...dataStyle,
        alignment: {
          ...(dataStyle.alignment ?? {}),
          horizontal: getHorizontalAlign(align),
        },
      })
    })
  })

  options.columns.forEach((column, index) => {
    const excelColumn = worksheet.getColumn(index + 1)
    const numFmt = getExportFormatNumFmt(column.columnDef.exportFormat)
    if (numFmt) excelColumn.numFmt = numFmt

    if (column.columnDef.exportWidth) {
      excelColumn.width = column.columnDef.exportWidth
      return
    }

    let maxLength = String(column.columnDef.exportHeader ?? column.label).length
    excelColumn.eachCell({ includeEmpty: false }, (cell) => {
      const text = cell.value instanceof Date ? 'yyyy-mm-dd hh:mm' : String(cell.value ?? '')
      maxLength = Math.max(maxLength, text.length)
    })
    excelColumn.width = Math.max(excelColumn.width ?? 10, Math.min(80, maxLength + 2))
  })

  if (options.config.autoFilter && options.columns.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: options.columns.length },
    }
  }

  if (options.config.freezeHeader) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  return workbook
}
