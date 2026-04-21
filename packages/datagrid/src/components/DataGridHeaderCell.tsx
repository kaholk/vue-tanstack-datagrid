import { FlexRender, type Column, type HeaderContext } from '@tanstack/vue-table'
import { defineComponent, h, type CSSProperties, type PropType, type VNodeChild } from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'
import type { DataGridColumn, DataGridFilterConfig } from '../types'

type AnyRow = Record<string, unknown>

export default defineComponent({
  name: 'DataGridHeaderCell',
  props: {
    header: {
      type: Object as PropType<HeaderContext<AnyRow, unknown>>,
      required: true,
    },
    column: {
      type: Object as PropType<Column<AnyRow, unknown>>,
      required: true,
    },
    pickerLabel: {
      type: String,
      required: true,
    },
    justifyContent: {
      type: String,
      required: true,
    },
    menuStyle: {
      type: Object as PropType<CSSProperties>,
      required: true,
    },
    isMenuOpen: {
      type: Boolean,
      required: true,
    },
    pinnedSide: {
      type: [String, Boolean] as PropType<'left' | 'right' | false>,
      required: true,
    },
    renderFilterControl: {
      type: Function as PropType<(config: DataGridFilterConfig) => VNodeChild>,
      required: true,
    },
    getColumnFilterConfig: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => DataGridFilterConfig>,
      required: true,
    },
    onToggleMenu: {
      type: Function as PropType<(columnId: string) => void>,
      required: true,
    },
    onToggleSorting: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => void>,
      required: true,
    },
    onSetSortDesc: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => void>,
      required: true,
    },
    onClearSorting: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => void>,
      required: true,
    },
    onSetPin: {
      type: Function as PropType<
        (column: Column<AnyRow, unknown>, side: 'left' | 'right' | false) => void
      >,
      required: true,
    },
    onCloseMenu: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      const columnDef = props.column.columnDef as DataGridColumn<AnyRow>
      const isServerColumn = Boolean(columnDef.serverField)
      const showFilter = columnDef.showFilter ?? isServerColumn
      const sortedState = props.column.getIsSorted()
      const customHeaderControl = columnDef.headerControl?.(props.header) as VNodeChild | undefined

      if (columnDef.headerMode === 'custom') {
        return h(
          'div',
          {
            class: 'data-grid__header-content data-grid__header-content--custom',
            style: { justifyContent: props.justifyContent },
          },
          [
            h(FlexRender, {
              render: props.header.header.column.columnDef.header,
              props: props.header,
            }),
          ],
        )
      }

      return h('div', { class: 'data-grid__header-content' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'data-grid__sort-button',
            onClick: (event: MouseEvent) => {
              event.stopPropagation()
              props.onToggleMenu(props.column.id)
            },
            style: { justifyContent: props.justifyContent },
          },
          [
            h(
              'span',
              { class: 'data-grid__header-label' },
              h(FlexRender, {
                render: props.header.header.column.columnDef.header,
                props: props.header,
              }),
            ),
            h(
              'span',
              { class: 'data-grid__sort-indicator' },
              sortedState === 'asc' ? '↑' : sortedState === 'desc' ? '↓' : '·',
            ),
          ],
        ),
        h('div', { class: 'data-grid__header-controls' }, [
          customHeaderControl
            ? h('div', { class: 'data-grid__header-control-slot' }, [customHeaderControl])
            : showFilter
              ? props.renderFilterControl(props.getColumnFilterConfig(props.column))
              : h('span', { class: 'data-grid__column-kind' }, isServerColumn ? 'no filter' : 'local'),
          props.isMenuOpen
            ? h(
                DataGridDropdownMenu,
                {
                  menuClass: 'data-grid__column-menu',
                  scopeAttr: 'data-grid-menu-root',
                  style: props.menuStyle,
                },
                {
                  default: () => [
                    h('div', { class: 'data-grid__menu-column-name' }, props.pickerLabel),
                    isServerColumn
                      ? h('div', { class: 'data-grid__menu-section' }, [
                          h('div', { class: 'data-grid__menu-title' }, 'Sort'),
                          h('div', { class: 'data-grid__menu-row' }, [
                            h(
                              'button',
                              {
                                type: 'button',
                                class: [
                                  'data-grid__menu-item',
                                  sortedState === 'asc' ? 'data-grid__menu-item--active' : '',
                                ],
                                onClick: () => props.onToggleSorting(props.column),
                                disabled: sortedState === 'asc',
                              },
                              'ASC',
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                class: [
                                  'data-grid__menu-item',
                                  sortedState === 'desc' ? 'data-grid__menu-item--active' : '',
                                ],
                                onClick: () => props.onSetSortDesc(props.column),
                                disabled: sortedState === 'desc',
                              },
                              'DESC',
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                class: 'data-grid__menu-item',
                                onClick: () => props.onClearSorting(props.column),
                                disabled: !sortedState,
                              },
                              'Clear',
                            ),
                          ]),
                        ])
                      : null,
                    h('div', { class: 'data-grid__menu-section' }, [
                      h('div', { class: 'data-grid__menu-title' }, 'Pin'),
                      h('div', { class: 'data-grid__menu-row' }, [
                        h(
                          'button',
                          {
                            type: 'button',
                            class: [
                              'data-grid__menu-item',
                              props.pinnedSide === 'left' ? 'data-grid__menu-item--active' : '',
                            ],
                            onClick: () => props.onSetPin(props.column, 'left'),
                            disabled: props.pinnedSide === 'left',
                          },
                          'Left',
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            class: [
                              'data-grid__menu-item',
                              props.pinnedSide === 'right' ? 'data-grid__menu-item--active' : '',
                            ],
                            onClick: () => props.onSetPin(props.column, 'right'),
                            disabled: props.pinnedSide === 'right',
                          },
                          'Right',
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            class: 'data-grid__menu-item',
                            onClick: () => props.onSetPin(props.column, false),
                            disabled: !props.pinnedSide,
                          },
                          'Unpin',
                        ),
                      ]),
                    ]),
                    h('div', { class: 'data-grid__menu-section' }, [
                      h(
                        'button',
                        {
                          type: 'button',
                          class: 'data-grid__menu-close',
                          onClick: props.onCloseMenu,
                        },
                        'Close',
                      ),
                    ]),
                  ],
                },
              )
            : null,
        ]),
      ])
    }
  },
})
