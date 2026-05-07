import { h, ref, type Ref, type VNodeChild } from 'vue'
import { type Column, type ColumnFiltersState, type PaginationState } from '@tanstack/vue-table'

import DataGridFilterControl from '../components/DataGridFilterControl'
import type { DataGridColumn, DataGridFilterConfig, DataGridFilterOption } from '../types'

type AnyRow = Record<string, unknown>

export type FilterControlTarget = 'live' | 'dialog'

type UseDataGridFiltersOptions = {
  columnFilters: Ref<ColumnFiltersState>
  draftColumnFilters: Ref<ColumnFiltersState>
  pagination: Ref<PaginationState>
  resetPageOnFilterChange?: () => boolean
  renderColumnPickerLabel: (column: Column<AnyRow, unknown>) => string
  onOpenFilterMenu: (options?: { keepDialogsOpen?: boolean }) => void
}

function toFilterOptionKey(value: DataGridFilterOption['value']) {
  return value === null ? '__data_grid_null__' : String(value)
}

function toFilterTextToken(value: DataGridFilterOption['value']) {
  return value === null || value === '' ? '""' : String(value)
}

function getFilterOptionValueFromText(value: string, options: DataGridFilterOption[]) {
  if (value === '""' || value === "''") {
    const emptyOption = options.find((option) => option.value === null || option.value === '')
    return emptyOption?.value ?? null
  }

  const matchingOption = options.find((option) => String(option.value ?? '') === value)
  return matchingOption?.value ?? value
}

export function useDataGridFilters(options: UseDataGridFiltersOptions) {
  const openHeaderFilterColumnId = ref<string | null>(null)
  const openToolbarFilterColumnId = ref<string | null>(null)
  const openDialogFilterColumnId = ref<string | null>(null)
  const filterSearchByColumnId = ref<Record<string, string>>({})
  const textFallbackFilterIds = ref<Set<string>>(new Set())
  const columnFilterConfigCache = new Map<string, { key: string; filterOptions: DataGridColumn<AnyRow>['filterOptions']; config: DataGridFilterConfig }>()

  function closeFilterMenus() {
    openHeaderFilterColumnId.value = null
    openToolbarFilterColumnId.value = null
    openDialogFilterColumnId.value = null
  }

  function getNextColumnFilters(
    filters: ColumnFiltersState,
    columnId: string,
    value: unknown,
  ): ColumnFiltersState {
    const hasValue = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== ''

    if (!hasValue) {
      return filters.filter((item) => item.id !== columnId)
    }

    return [
      ...filters.filter((item) => item.id !== columnId),
      {
        id: columnId,
        value,
      },
    ]
  }

  function updateColumnFilter(columnId: string, value: string, target: FilterControlTarget = 'live') {
    setColumnFilterValue(columnId, value.trim() ? value : undefined, target)
  }

  function setColumnFilterValue(columnId: string, value: unknown, target: FilterControlTarget = 'live') {
    if (target === 'dialog') {
      options.draftColumnFilters.value = getNextColumnFilters(
        options.draftColumnFilters.value,
        columnId,
        value,
      )
      return
    }

    if (options.resetPageOnFilterChange?.() ?? true) {
      options.pagination.value = {
        ...options.pagination.value,
        pageIndex: 0,
      }
    }
    options.columnFilters.value = getNextColumnFilters(options.columnFilters.value, columnId, value)
  }

  function getFilterRawValue(columnId: string, target: FilterControlTarget = 'live') {
    const filters = target === 'dialog' ? options.draftColumnFilters.value : options.columnFilters.value
    return filters.find((item) => item.id === columnId)?.value
  }

  function getFilterValue(columnId: string, target: FilterControlTarget = 'live') {
    return String(getFilterRawValue(columnId, target) ?? '')
  }

  function isTextFallbackFilter(config: DataGridFilterConfig, target: FilterControlTarget = 'live') {
    return Boolean(config.textFallback && textFallbackFilterIds.value.has(config.id))
  }

  function getFilterTextValue(config: DataGridFilterConfig, target: FilterControlTarget = 'live') {
    const rawValue = getFilterRawValue(config.id, target)

    if (Array.isArray(rawValue)) {
      return rawValue
        .map((value) => toFilterTextToken(value as DataGridFilterOption['value']))
        .filter((value) => value !== '')
        .join(config.valueSeparator ?? '|')
    }

    return String(rawValue ?? '')
  }

  function getSingleSelectFilterValue(columnId: string, target: FilterControlTarget = 'live') {
    const rawValue = getFilterRawValue(columnId, target)

    if (Array.isArray(rawValue)) {
      return rawValue[0]
    }

    return rawValue as DataGridFilterOption['value'] | undefined
  }

  function getSelectFilterValues(config: DataGridFilterConfig, target: FilterControlTarget = 'live') {
    const rawValue = getFilterRawValue(config.id, target)

    if (Array.isArray(rawValue)) {
      return rawValue as DataGridFilterOption['value'][]
    }

    if (typeof rawValue !== 'string' || !rawValue.trim()) {
      return []
    }

    const filterOptions = getFilterOptions(config)

    return rawValue
      .split(config.valueSeparator ?? '|')
      .map((value) => value.trim())
      .filter((value) => value !== '')
      .map((value) => getFilterOptionValueFromText(value, filterOptions))
  }

  function toggleFilterMenu(
    columnId: string,
    menuOptions?: { keepDialogsOpen?: boolean; target?: 'toolbar' | 'header' | 'dialog' },
  ) {
    const target = menuOptions?.target ?? 'header'
    const keepDialogsOpen = target === 'dialog' ? true : menuOptions?.keepDialogsOpen

    options.onOpenFilterMenu({ keepDialogsOpen })

    if (target === 'dialog') {
      openDialogFilterColumnId.value = openDialogFilterColumnId.value === columnId ? null : columnId
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
      return
    }

    if (target === 'toolbar') {
      openToolbarFilterColumnId.value =
        openToolbarFilterColumnId.value === columnId ? null : columnId
      openHeaderFilterColumnId.value = null
    } else {
      openHeaderFilterColumnId.value =
        openHeaderFilterColumnId.value === columnId ? null : columnId
      openToolbarFilterColumnId.value = null
    }

    openDialogFilterColumnId.value = null
  }

  function getFilterSearchStateKey(columnId: string, target: FilterControlTarget) {
    return `${target}:${columnId}`
  }

  function updateSelectFilterSearch(
    columnId: string,
    value: string,
    target: FilterControlTarget = 'live',
  ) {
    const stateKey = getFilterSearchStateKey(columnId, target)
    filterSearchByColumnId.value = {
      ...filterSearchByColumnId.value,
      [stateKey]: value,
    }
  }

  function getSelectFilterSearch(columnId: string, target: FilterControlTarget = 'live') {
    return filterSearchByColumnId.value[getFilterSearchStateKey(columnId, target)] ?? ''
  }

  function getFilterOptions(config: DataGridFilterConfig) {
    const filterOptions = [
      ...(config.optionsResolver?.({
        columnFilters: options.columnFilters.value,
        draftColumnFilters: options.draftColumnFilters.value,
      }) ??
        config.options ??
        []),
    ]

    if (config.includeEmptyOption) {
      filterOptions.unshift({
        label: config.emptyOptionLabel ?? 'Puste',
        value: null,
      })
    }

    return filterOptions
  }

  function getColumnFilterConfig(column: Column<AnyRow, unknown>): DataGridFilterConfig {
    const columnDef = column.columnDef as DataGridColumn<AnyRow>
    const key = [
      options.renderColumnPickerLabel(column),
      columnDef.filterGroup ?? 'Kolumny',
      columnDef.filterVariant ?? '',
      columnDef.filterTextFallback ? '1' : '0',
      columnDef.filterValueSeparator ?? '',
      columnDef.filterIncludeEmptyOption ? '1' : '0',
      columnDef.filterEmptyOptionLabel ?? '',
      columnDef.filterPlaceholder ?? 'Filtr',
    ].join('::')
    const cached = columnFilterConfigCache.get(column.id)
    if (cached?.key === key && cached.filterOptions === columnDef.filterOptions) {
      return cached.config
    }

    const config = {
      id: column.id,
      label: options.renderColumnPickerLabel(column),
      group: columnDef.filterGroup ?? 'Kolumny',
      variant: columnDef.filterVariant,
      textFallback: columnDef.filterTextFallback,
      valueSeparator: columnDef.filterValueSeparator,
      options: Array.isArray(columnDef.filterOptions) ? columnDef.filterOptions : undefined,
      optionsResolver:
        typeof columnDef.filterOptions === 'function' ? columnDef.filterOptions : undefined,
      includeEmptyOption: columnDef.filterIncludeEmptyOption,
      emptyOptionLabel: columnDef.filterEmptyOptionLabel,
      placeholder: columnDef.filterPlaceholder ?? 'Filtr',
    }
    columnFilterConfigCache.set(column.id, { key, filterOptions: columnDef.filterOptions, config })
    return config
  }

  function getVisibleFilterOptions(config: DataGridFilterConfig, target: FilterControlTarget = 'live') {
    const filterOptions = getFilterOptions(config)
    const searchTerm = getSelectFilterSearch(config.id, target).trim().toLocaleLowerCase()

    if (!searchTerm) {
      return filterOptions
    }

    return filterOptions.filter((option) => option.label.toLocaleLowerCase().includes(searchTerm))
  }

  function toggleSelectFilterValue(
    columnId: string,
    optionValue: DataGridFilterOption['value'],
    checked: boolean,
    target: FilterControlTarget = 'live',
  ) {
    const currentValues = getSelectFilterValues({ id: columnId, label: columnId }, target)
    const normalizedValue = toFilterOptionKey(optionValue)
    const nextValues = currentValues.filter((value) => toFilterOptionKey(value) !== normalizedValue)

    if (checked) {
      nextValues.push(optionValue)
    }

    setColumnFilterValue(columnId, nextValues, target)
  }

  function setSingleSelectFilterValue(
    columnId: string,
    optionValue: DataGridFilterOption['value'],
    checked: boolean,
    target: FilterControlTarget = 'live',
  ) {
    const currentValue = getSingleSelectFilterValue(columnId, target)
    const currentKey = currentValue === undefined ? '' : toFilterOptionKey(currentValue)
    const nextKey = toFilterOptionKey(optionValue)

    if (!checked || currentKey === nextKey) {
      setColumnFilterValue(columnId, undefined, target)
      return
    }

    setColumnFilterValue(columnId, optionValue, target)
  }

  function selectAllFilterOptions(config: DataGridFilterConfig, target: FilterControlTarget = 'live') {
    const filterOptions = getFilterOptions(config).map((option) => option.value)
    setColumnFilterValue(config.id, filterOptions, target)
  }

  function clearSelectFilterOptions(filterId: string, target: FilterControlTarget = 'live') {
    setColumnFilterValue(filterId, undefined, target)
  }

  function getFilterButtonLabel(config: DataGridFilterConfig, target: FilterControlTarget = 'live') {
    if (config.variant !== 'select' && config.variant !== 'radio') {
      return 'Filtr'
    }

    if (isTextFallbackFilter(config, target)) {
      const value = getFilterTextValue(config, target)
      return value ? value : 'Filtr'
    }

    const filterOptions = getFilterOptions(config)
    const selectedValues =
      isTextFallbackFilter(config, target)
        ? []
        : config.variant === 'radio'
        ? (() => {
            const singleValue = getSingleSelectFilterValue(config.id, target)
            return singleValue === undefined ? [] : [singleValue]
          })()
        : getSelectFilterValues(config, target)

    if (selectedValues.length === 0) {
      return 'Wybierz'
    }

    if (selectedValues.length === filterOptions.length) {
      return 'Wszystkie'
    }

    if (selectedValues.length === 1) {
      const selectedValue = selectedValues[0]

      if (selectedValue === undefined) {
        return '1 wybrana'
      }

      const selectedOption = filterOptions.find(
        (option) => toFilterOptionKey(option.value) === toFilterOptionKey(selectedValue),
      )
      return selectedOption?.label ?? '1 wybrana'
    }

    return `${selectedValues.length} wybrane`
  }

  function renderFilterControl(
    config: DataGridFilterConfig,
    renderOptions?: { toolbar?: boolean; target?: FilterControlTarget },
  ): VNodeChild {
    const isToolbar = renderOptions?.toolbar ?? false
    const target = renderOptions?.target ?? 'live'
    const isOpen =
      target === 'dialog'
        ? openDialogFilterColumnId.value === config.id
        : isToolbar
          ? openToolbarFilterColumnId.value === config.id
          : openHeaderFilterColumnId.value === config.id
    const isSelectFilter = config.variant === 'select' || config.variant === 'radio'
    const selectedValues =
      isSelectFilter
        ? config.variant === 'radio'
          ? (() => {
              const singleValue = getSingleSelectFilterValue(config.id, target)
              return singleValue === undefined ? [] : [singleValue]
            })()
          : getSelectFilterValues(config, target)
        : []
    const selectedValueKeys = isSelectFilter ? new Set(selectedValues.map((value) => toFilterOptionKey(value))) : undefined

    return h(DataGridFilterControl, {
      config,
      isToolbar,
      isOpen,
      inputValue:
        isSelectFilter
          ? getFilterTextValue(config, target)
          : getFilterValue(config.id, target),
      buttonLabel: getFilterButtonLabel(config, target),
      selectedCount: selectedValues.length,
      selectedValueKeys,
      allOptions: isSelectFilter && isOpen ? getFilterOptions(config) : [],
      visibleOptions: isSelectFilter && isOpen ? getVisibleFilterOptions(config, target) : [],
      searchValue: getSelectFilterSearch(config.id, target),
      textMode: isTextFallbackFilter(config, target),
      onToggleMenu: (event: MouseEvent) => {
        event.stopPropagation()
        toggleFilterMenu(config.id, {
          keepDialogsOpen: isToolbar || target === 'dialog',
          target: target === 'dialog' ? 'dialog' : isToolbar ? 'toolbar' : 'header',
        })
      },
      onInput: (value: string) => updateColumnFilter(config.id, value, target),
      onApplySelectFilter: (value: string | DataGridFilterOption['value'][], textMode: boolean) => {
        const nextIds = new Set(textFallbackFilterIds.value)

        if (textMode) {
          nextIds.add(config.id)
        } else {
          nextIds.delete(config.id)
        }

        textFallbackFilterIds.value = nextIds
        const nextValue =
          !textMode && Array.isArray(value) && config.valueSeparator
            ? value
                .map((entry) => toFilterTextToken(entry))
                .filter((entry) => entry !== '')
                .join(config.valueSeparator)
            : value

        setColumnFilterValue(config.id, nextValue, target)
        closeFilterMenus()
      },
      onCancelSelectFilter: closeFilterMenus,
      onSearchChange: (value: string) => updateSelectFilterSearch(config.id, value, target),
    })
  }

  return {
    closeFilterMenus,
    getColumnFilterConfig,
    renderFilterControl,
  }
}
