import { FlexRender, type Column, type HeaderContext } from '@tanstack/vue-table'
import { defineComponent, h, type CSSProperties, type PropType, type VNodeChild } from 'vue'
import IconCloseRounded from '~icons/material-symbols/close-rounded'
import IconLeftPanelCloseRounded from '~icons/material-symbols/left-panel-close-rounded'
import IconNorthRounded from '~icons/material-symbols/north-rounded'
import IconRightPanelCloseRounded from '~icons/material-symbols/right-panel-close-rounded'
import IconSouthRounded from '~icons/material-symbols/south-rounded'
import IconUnfoldMoreRounded from '~icons/material-symbols/unfold-more-rounded'

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

      const sortIndicator =
        sortedState === 'asc'
          ? h(IconNorthRounded, { class: 'data-grid__icon' })
          : sortedState === 'desc'
            ? h(IconSouthRounded, { class: 'data-grid__icon' })
            : h(IconUnfoldMoreRounded, { class: 'data-grid__icon' })

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
            h('span', { class: 'data-grid__sort-indicator' }, sortIndicator),
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
                              [
                                h(IconNorthRounded, { class: 'data-grid__menu-item-icon' }),
                                h('span', 'ASC'),
                              ],
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
                              [
                                h(IconSouthRounded, { class: 'data-grid__menu-item-icon' }),
                                h('span', 'DESC'),
                              ],
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                class: 'data-grid__menu-item',
                                onClick: () => props.onClearSorting(props.column),
                                disabled: !sortedState,
                              },
                              [
                                h(IconCloseRounded, { class: 'data-grid__menu-item-icon' }),
                                h('span', 'Clear'),
                              ],
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
                          [
                            h(IconLeftPanelCloseRounded, { class: 'data-grid__menu-item-icon' }),
                            h('span', 'Left'),
                          ],
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
                          [
                            h(IconRightPanelCloseRounded, { class: 'data-grid__menu-item-icon' }),
                            h('span', 'Right'),
                          ],
                        ),
                        h(
                          'button',
                          {
                            type: 'button',
                            class: 'data-grid__menu-item',
                            onClick: () => props.onSetPin(props.column, false),
                            disabled: !props.pinnedSide,
                          },
                          [
                            h(IconCloseRounded, { class: 'data-grid__menu-item-icon' }),
                            h('span', 'Unpin'),
                          ],
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
                        [
                          h(IconCloseRounded, { class: 'data-grid__menu-item-icon' }),
                          h('span', 'Close'),
                        ],
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
