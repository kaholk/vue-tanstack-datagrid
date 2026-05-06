import { computed, type CSSProperties, type Ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { Column, ColumnPinningState, Header, Row } from '@tanstack/vue-table'

import type { DataGridColumn } from '../types'
import { toJustifyContent } from '../utils/columns'

type AnyRow = Record<string, unknown>

export type RenderedSequenceItem<TItem> = { type: 'spacer'; key: string; width: number } | { type: 'item'; key: string; item: TItem; column: Column<AnyRow, unknown> }

type UseDataGridVirtualizationOptions = {
  scrollElementRef: Ref<HTMLDivElement | null>
  visibleRows: Ref<Row<AnyRow>[]>
  visibleColumns: Ref<Column<AnyRow, unknown>[]>
  visibleHeaders: Ref<Header<AnyRow, unknown>[]>
  allLeafColumnsById: Ref<Map<string, Column<AnyRow, unknown>>>
  visibleColumnIndexById: Ref<Map<string, number>>
  columnPinning: Ref<ColumnPinningState>
  rowHeight: () => number
  overscanRows: () => number
  overscanColumns: () => number
}

function buildRenderedColumnSequence<TItem extends Column<AnyRow, unknown> | Header<AnyRow, unknown>>(
  orderedItems: TItem[],
  getColumn: (item: TItem) => Column<AnyRow, unknown>,
  renderedNonPinnedIds: Set<string>,
  getPinnedSide: (columnId: string) => 'left' | 'right' | false,
): RenderedSequenceItem<TItem>[] {
  const sequence: RenderedSequenceItem<TItem>[] = []
  let spacerWidth = 0
  let spacerIndex = 0

  for (const item of orderedItems) {
    const column = getColumn(item)
    const pinnedSide = getPinnedSide(column.id)

    if (pinnedSide || renderedNonPinnedIds.has(column.id)) {
      if (spacerWidth > 0) {
        sequence.push({
          type: 'spacer',
          key: `spacer-${spacerIndex}`,
          width: spacerWidth,
        })
        spacerWidth = 0
        spacerIndex += 1
      }

      sequence.push({
        type: 'item',
        key: column.id,
        item,
        column,
      })
      continue
    }

    spacerWidth += column.getSize()
  }

  if (spacerWidth > 0) {
    sequence.push({
      type: 'spacer',
      key: `spacer-${spacerIndex}`,
      width: spacerWidth,
    })
  }

  return sequence
}

export function useDataGridVirtualization(options: UseDataGridVirtualizationOptions) {
  const leftPinnedColumnIds = computed(() => new Set(options.columnPinning.value.left ?? []))
  const rightPinnedColumnIds = computed(() => new Set(options.columnPinning.value.right ?? []))
  let previousCellStylesKey = ''
  let previousCellStylesByColumnId = new Map<string, CSSProperties>()

  function getPinnedSide(columnId: string): 'left' | 'right' | false {
    if (leftPinnedColumnIds.value.has(columnId)) {
      return 'left'
    }

    if (rightPinnedColumnIds.value.has(columnId)) {
      return 'right'
    }

    return false
  }

  const nonPinnedColumns = computed(() => options.visibleColumns.value.filter((column) => !getPinnedSide(column.id)))

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>(
    computed(() => ({
      count: options.visibleRows.value.length,
      getScrollElement: () => options.scrollElementRef.value,
      estimateSize: () => options.rowHeight(),
      overscan: options.overscanRows(),
    })),
  )

  const columnVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>(
    computed(() => ({
      horizontal: true,
      count: nonPinnedColumns.value.length,
      getScrollElement: () => options.scrollElementRef.value,
      estimateSize: (index) => nonPinnedColumns.value[index]?.getSize() ?? 160,
      overscan: options.overscanColumns(),
    })),
  )

  const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
  const virtualNonPinnedColumns = computed(() => columnVirtualizer.value.getVirtualItems())
  const totalRowHeight = computed(() => rowVirtualizer.value.getTotalSize())
  const renderedNonPinnedIds = computed(() => new Set(virtualNonPinnedColumns.value.map((virtualColumn) => nonPinnedColumns.value[virtualColumn.index]?.id).filter((value): value is string => Boolean(value))))
  const headerSequence = computed(() => buildRenderedColumnSequence(options.visibleHeaders.value, (header) => header.column, renderedNonPinnedIds.value, getPinnedSide))
  const rowSequence = computed(() => buildRenderedColumnSequence(options.visibleColumns.value, (column) => column, renderedNonPinnedIds.value, getPinnedSide))
  const cellStylesByColumnId = computed(() => {
    const stylesKey = [
      options.visibleColumns.value.map((column) => `${column.id}:${column.getSize()}:${(column.columnDef as DataGridColumn<AnyRow>).align ?? ''}`).join('|'),
      (options.columnPinning.value.left ?? []).join('|'),
      (options.columnPinning.value.right ?? []).join('|'),
    ].join('::')

    if (stylesKey === previousCellStylesKey) {
      return previousCellStylesByColumnId
    }

    const styles = new Map<string, CSSProperties>()
    let leftOffset = 0
    const leftPinnedIds = options.columnPinning.value.left ?? []
    const rightPinnedIds = options.columnPinning.value.right ?? []

    for (let index = 0; index < leftPinnedIds.length; index += 1) {
      const columnId = leftPinnedIds[index]
      if (!columnId) {
        continue
      }
      const column = options.allLeafColumnsById.value.get(columnId)
      if (!column || !options.visibleColumnIndexById.value.has(columnId)) {
        continue
      }

      styles.set(column.id, {
        width: `${column.getSize()}px`,
        left: `${leftOffset}px`,
        zIndex: `${60 - index}`,
        justifyContent: toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align),
      })
      leftOffset += column.getSize()
    }

    let rightOffset = 0
    for (let index = rightPinnedIds.length - 1; index >= 0; index -= 1) {
      const columnId = rightPinnedIds[index]
      if (!columnId) {
        continue
      }
      const column = options.allLeafColumnsById.value.get(columnId)
      if (!column || !options.visibleColumnIndexById.value.has(columnId)) {
        continue
      }

      styles.set(column.id, {
        width: `${column.getSize()}px`,
        right: `${rightOffset}px`,
        zIndex: `${60 - index}`,
        justifyContent: toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align),
      })
      rightOffset += column.getSize()
    }

    for (const column of options.visibleColumns.value) {
      if (styles.has(column.id)) {
        continue
      }

      styles.set(column.id, {
        width: `${column.getSize()}px`,
        justifyContent: toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align),
      })
    }

    previousCellStylesKey = stylesKey
    previousCellStylesByColumnId = styles
    return styles
  })

  return {
    rowVirtualizer,
    columnVirtualizer,
    virtualRows,
    totalRowHeight,
    headerSequence,
    rowSequence,
    cellStylesByColumnId,
    getPinnedSide,
  }
}
