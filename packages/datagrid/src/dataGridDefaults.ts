import type {
  DataGridLoadingConfig,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridSelectionPanelConfig,
} from './types'

export const dataGridHeaderHeight = 92

export const defaultDataGridMetaItems: DataGridMetaConfig[] = [
  { key: 'rows', label: 'Rows' },
  { key: 'fetched', label: 'Fetched' },
  { key: 'datasetSize', label: 'Dataset' },
]

export const defaultDataGridPageSizeConfig: DataGridPageSizeConfig = {
  label: 'Rows',
  options: [50, 100, 250, 500],
}

export const defaultDataGridSelectionPanelConfig: DataGridSelectionPanelConfig = {
  position: 'bottom-right',
  sumColumns: [],
  copyColumnIds: undefined,
  copyIncludeHeaders: true,
  selectedRowsLabel: 'Zaznaczone wiersze',
  copyWithHeadersLabel: 'Kopiuj z naglowkami',
  copyWithoutHeadersLabel: 'Kopiuj bez naglowkow',
  allowPositionChange: true,
  positionStorageKey: '',
  floatingPosition: { x: 16, y: 16 },
}

export const defaultDataGridLoadingConfig: DataGridLoadingConfig = {
  variant: 'overlay',
  label: undefined,
}
