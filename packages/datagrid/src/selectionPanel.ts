import type { RowData } from '@tanstack/vue-table'

import type {
  DataGridSelectionPanelAction,
  DataGridSelectionPanelConfig,
  DataGridSelectionPanelSumConfig,
} from './types'

export function createDataGridSelectionPanelConfig<TData extends RowData>(
  config: DataGridSelectionPanelConfig<TData>,
): DataGridSelectionPanelConfig<TData> {
  return config
}

export function createDataGridSelectionPanelAction<TData extends RowData>(
  action: DataGridSelectionPanelAction<TData>,
): DataGridSelectionPanelAction<TData> {
  return action
}

export function createDataGridSelectionPanelSum(
  columnId: string,
  label?: string,
  formatValue?: (value: number) => string,
): DataGridSelectionPanelSumConfig {
  const sum: DataGridSelectionPanelSumConfig = { columnId }

  if (label !== undefined) {
    sum.label = label
  }

  if (formatValue !== undefined) {
    sum.formatValue = formatValue
  }

  return sum
}
