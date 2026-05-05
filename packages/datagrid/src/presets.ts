import type { RowData } from '@tanstack/vue-table'

import type { DataGridExcelExportConfig, DataGridExcelExportContext, DataGridPreset } from './types'

export function createDataGridPreset<TData extends RowData>(
  preset: DataGridPreset<TData>,
): DataGridPreset<TData> {
  return {
    ...preset,
    initialState: preset.initialState ? { ...preset.initialState } : undefined,
    pageSizeConfig: preset.pageSizeConfig ? { ...preset.pageSizeConfig } : undefined,
    metaItems: preset.metaItems ? preset.metaItems.map((item) => ({ ...item })) : undefined,
    loadingConfig: preset.loadingConfig ? { ...preset.loadingConfig } : undefined,
    selectionPanelConfig: preset.selectionPanelConfig ? { ...preset.selectionPanelConfig } : undefined,
    rowSelectionConfig: preset.rowSelectionConfig ? { ...preset.rowSelectionConfig } : undefined,
    cellSelectionConfig: preset.cellSelectionConfig ? { ...preset.cellSelectionConfig } : undefined,
    excelExport:
      preset.excelExport && typeof preset.excelExport === 'object'
        ? { ...preset.excelExport }
        : preset.excelExport,
  }
}

export function createDataGridExcelExportConfig<TData extends RowData = RowData>(options: {
  baseFileName: string
  sheetName?: string
  onError?: (error: unknown) => void
  fileName?: string | ((context: DataGridExcelExportContext) => string)
} & Omit<DataGridExcelExportConfig<TData>, 'fileName' | 'sheetName' | 'onError'>): DataGridExcelExportConfig<TData> {
  const { baseFileName, sheetName, onError, fileName, ...rest } = options

  return {
    ...rest,
    sheetName,
    onError,
    fileName:
      fileName ??
      (({ mode }) => {
        const date = new Date().toISOString().split('T')[0]
        return `${baseFileName}_${mode}_${date}.xlsx`
      }),
  }
}
