import { computed, onMounted, ref, watch, type Ref } from 'vue'
import type { Row, RowSelectionState } from '@tanstack/vue-table'

import { defaultDataGridSelectionPanelConfig } from '../dataGridDefaults'
import type {
  DataGridFloatingPosition,
  DataGridLocaleText,
  DataGridSelectionPanelActionContext,
  DataGridSelectionPanelConfig,
  DataGridSelectionPanelPosition,
} from '../types'
import type { AnyRow, SelectionPanelSection } from '../types/internal'

type UseDataGridSelectionPanelOptions = {
  effectiveSelectionPanelConfig: Ref<DataGridSelectionPanelConfig<AnyRow> | undefined>
  localeText: Ref<Required<DataGridLocaleText>>
  viewStorageKey: () => string
  rowSelection: Ref<RowSelectionState>
  visibleRowById: Ref<Map<string, Row<AnyRow>>>
}

type UseDataGridSelectionPanelSectionsOptions = {
  mergedSelectionPanelConfig: Ref<DataGridSelectionPanelConfig<AnyRow> | null>
  localeText: Ref<Required<DataGridLocaleText>>
  selectedRows: Ref<Row<AnyRow>[]>
  selectedColumnIds: Ref<string[]>
  selectedCellCount: Ref<number>
  clearSelectedRows: () => void
  clearSelectedColumns: () => void
  clearSelectedCells: () => void
  copySelectedRows: (includeHeaders: boolean) => void | Promise<void>
  copySelectedCells: (includeHeaders: boolean) => void | Promise<void>
}

function isSelectionPanelPosition(value: string | null): value is DataGridSelectionPanelPosition {
  return (
    value === 'bottom-left' ||
    value === 'bottom-right' ||
    value === 'top-left' ||
    value === 'top-right' ||
    value === 'floating'
  )
}

export function useDataGridSelectionPanel(options: UseDataGridSelectionPanelOptions) {
  const selectionPanelPosition = ref<DataGridSelectionPanelPosition>(
    options.effectiveSelectionPanelConfig.value?.position ??
      defaultDataGridSelectionPanelConfig.position ??
      'bottom-right',
  )
  const selectionPanelFloatingPosition = ref<DataGridFloatingPosition>(
    options.effectiveSelectionPanelConfig.value?.floatingPosition ??
      defaultDataGridSelectionPanelConfig.floatingPosition ?? { x: 16, y: 16 },
  )
  const selectionPanelPositionStorageKey = computed(() => {
    if (options.effectiveSelectionPanelConfig.value?.positionStorageKey) {
      return options.effectiveSelectionPanelConfig.value.positionStorageKey
    }

    if (options.viewStorageKey()) {
      return `${options.viewStorageKey()}:selection-panel-position`
    }

    return ''
  })
  const mergedSelectionPanelConfig = computed<DataGridSelectionPanelConfig<AnyRow> | null>(() => {
    const config = options.effectiveSelectionPanelConfig.value
    if (!config) {
      return null
    }

    return {
      position: selectionPanelPosition.value ?? config.position ?? defaultDataGridSelectionPanelConfig.position,
      sumColumns: config.sumColumns ?? defaultDataGridSelectionPanelConfig.sumColumns,
      actions: config.actions ?? defaultDataGridSelectionPanelConfig.actions,
      copyColumnIds: config.copyColumnIds ?? defaultDataGridSelectionPanelConfig.copyColumnIds,
      copyIncludeHeaders: config.copyIncludeHeaders ?? defaultDataGridSelectionPanelConfig.copyIncludeHeaders,
      selectedRowsLabel: config.selectedRowsLabel ?? options.localeText.value.selectedRowsLabel,
      copyWithHeadersLabel: config.copyWithHeadersLabel ?? options.localeText.value.copyWithHeadersLabel,
      copyWithoutHeadersLabel: config.copyWithoutHeadersLabel ?? options.localeText.value.copyWithoutHeadersLabel,
      allowPositionChange: config.allowPositionChange ?? defaultDataGridSelectionPanelConfig.allowPositionChange,
      positionStorageKey: config.positionStorageKey ?? defaultDataGridSelectionPanelConfig.positionStorageKey,
      floatingPosition:
        selectionPanelFloatingPosition.value ??
        config.floatingPosition ??
        defaultDataGridSelectionPanelConfig.floatingPosition,
    }
  })
  const selectedRows = computed<Row<AnyRow>[]>(() => {
    if (!mergedSelectionPanelConfig.value || Object.keys(options.rowSelection.value).length === 0) {
      return []
    }

    const rows: Row<AnyRow>[] = []
    const rowsById = options.visibleRowById.value
    for (const [rowId, selected] of Object.entries(options.rowSelection.value)) {
      if (!selected) {
        continue
      }
      const row = rowsById.get(rowId)
      if (row) {
        rows.push(row)
      }
    }
    return rows
  })

  function updateSelectionPanelPosition(position: DataGridSelectionPanelPosition) {
    selectionPanelPosition.value = position
  }

  function updateSelectionPanelFloatingPosition(position: DataGridFloatingPosition) {
    selectionPanelFloatingPosition.value = position
  }

  onMounted(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storageKey = selectionPanelPositionStorageKey.value
    if (!storageKey) {
      return
    }

    const storedPosition = window.localStorage.getItem(storageKey)
    if (isSelectionPanelPosition(storedPosition)) {
      selectionPanelPosition.value = storedPosition
    }

    const storedFloatingPosition = window.localStorage.getItem(`${storageKey}:floating`)
    if (storedFloatingPosition) {
      try {
        const parsed = JSON.parse(storedFloatingPosition) as Partial<DataGridFloatingPosition>
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          selectionPanelFloatingPosition.value = { x: parsed.x, y: parsed.y }
        }
      } catch {
        // Ignore invalid storage payloads.
      }
    }
  })

  watch(selectionPanelPosition, (position) => {
    const storageKey = selectionPanelPositionStorageKey.value
    if (!storageKey || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(storageKey, position)
  })

  watch(selectionPanelFloatingPosition, (position) => {
    const storageKey = selectionPanelPositionStorageKey.value
    if (!storageKey || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(`${storageKey}:floating`, JSON.stringify(position))
  })

  return {
    selectionPanelPosition,
    selectionPanelFloatingPosition,
    selectionPanelPositionStorageKey,
    mergedSelectionPanelConfig,
    selectedRows,
    updateSelectionPanelPosition,
    updateSelectionPanelFloatingPosition,
  }
}

export function useDataGridSelectionPanelSections(options: UseDataGridSelectionPanelSectionsOptions) {
  const selectedRowActionContext = computed<DataGridSelectionPanelActionContext<AnyRow>>(() => ({
    selectedRows: options.selectedRows.value.map((row) => row.original),
    selectedRowIds: options.selectedRows.value.map((row) => row.original.id as string | number),
    clearSelection: options.clearSelectedRows,
  }))
  const selectionPanelSections = computed<SelectionPanelSection[]>(() => {
    const sections: SelectionPanelSection[] = []

    if (options.selectedRows.value.length > 0) {
      sections.push({
        id: 'rows',
        label: options.mergedSelectionPanelConfig.value?.selectedRowsLabel ?? 'Zaznaczone wiersze',
        count: options.selectedRows.value.length,
        copyLabel: options.localeText.value.copyRowsLabel,
        clearLabel: 'Wyczysc wiersze',
        onCopy: (copyOptions: { includeHeaders: boolean }) =>
          options.copySelectedRows(copyOptions.includeHeaders),
        onClear: options.clearSelectedRows,
      })
    }

    if (options.selectedColumnIds.value.length > 0) {
      sections.push({
        id: 'columns',
        label: options.localeText.value.selectedColumnsLabel,
        count: options.selectedColumnIds.value.length,
        copyLabel: options.localeText.value.copyColumnsLabel,
        clearLabel: 'Wyczysc kolumny',
        onCopy: (copyOptions: { includeHeaders: boolean }) =>
          options.copySelectedCells(copyOptions.includeHeaders),
        onClear: options.clearSelectedColumns,
      })
    }

    if (options.selectedCellCount.value > 0) {
      sections.push({
        id: 'cells',
        label: options.localeText.value.selectedCellsLabel,
        count: options.selectedCellCount.value,
        copyLabel: options.localeText.value.copyCellsLabel,
        clearLabel: 'Wyczysc komorki',
        onCopy: (copyOptions: { includeHeaders: boolean }) =>
          options.copySelectedCells(copyOptions.includeHeaders),
        onClear: options.clearSelectedCells,
      })
    }

    return sections
  })
  const selectionPanelActions = computed(() =>
    options.mergedSelectionPanelConfig.value?.actions
      ?.filter((action) => {
        const hidden =
          typeof action.hidden === 'function'
            ? action.hidden(selectedRowActionContext.value)
            : (action.hidden ?? false)
        return !hidden
      })
      .map((action) => ({
        id: action.id,
        label: action.label,
        title: action.title,
        disabled:
          typeof action.disabled === 'function'
            ? action.disabled(selectedRowActionContext.value)
            : (action.disabled ?? false),
        onClick: () => action.onClick(selectedRowActionContext.value),
      })) ?? [],
  )

  return {
    selectedRowActionContext,
    selectionPanelSections,
    selectionPanelActions,
  }
}
