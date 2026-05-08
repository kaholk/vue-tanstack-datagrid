import { type Column } from '@tanstack/vue-table'
import { defineComponent, type PropType } from 'vue'

import DataGridDialog from './DataGridDialog'
import DataGridValidatedNumberInput from '../common/DataGridValidatedNumberInput'

type AnyRow = Record<string, unknown>

export default defineComponent({
  name: 'DataGridColumnPickerDialog',
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    columns: {
      type: Array as PropType<Column<AnyRow, unknown>[]>,
      required: true,
    },
    renderColumnLabel: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => string>,
      required: true,
    },
    getIsColumnVisible: {
      type: Function as PropType<(columnId: string) => boolean>,
      required: true,
    },
    getPinnedSide: {
      type: Function as PropType<(columnId: string) => 'left' | 'right' | false>,
      required: true,
    },
    getColumnSize: {
      type: Function as PropType<(columnId: string) => number>,
      required: true,
    },
    getColumnMoveTarget: {
      type: Function as PropType<(columnId: string) => string>,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onApply: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleColumnVisibility: {
      type: Function as PropType<(columnId: string, isVisible: boolean) => void>,
      required: true,
    },
    onUpdateColumnSize: {
      type: Function as PropType<(columnId: string, rawValue: string) => void>,
      required: true,
    },
    onSetPin: {
      type: Function as PropType<(columnId: string, side: 'left' | 'right' | false) => void>,
      required: true,
    },
    onMoveColumn: {
      type: Function as PropType<(columnId: string, direction: -1 | 1) => void>,
      required: true,
    },
    onUpdateColumnMoveTarget: {
      type: Function as PropType<(columnId: string, targetColumnId: string) => void>,
      required: true,
    },
    onMoveColumnRelative: {
      type: Function as PropType<
        (columnId: string, targetColumnId: string, position: 'before' | 'after') => void
      >,
      required: true,
    },
  },
  setup(props) {
    return () => {
      if (!props.isOpen) {
        return null
      }

      return (
        <DataGridDialog
          title="Columns"
          subtitle="Visibility, width, order and pin settings."
          ariaLabel="Column settings"
          onClose={props.onClose}
          v-slots={{
            footer: () => (
              <button type="button" class="data-grid__dialog-action" onClick={props.onApply}>
                Zastosuj zmiany
              </button>
            ),
          }}
        >
          <div class="data-grid__dialog-list">
            {props.columns.map((column, index) => {
              const moveTarget = props.getColumnMoveTarget(column.id)

              return (
                <div key={column.id} class="data-grid__dialog-row">
                  <div class="data-grid__dialog-main">
                    <label class="data-grid__column-option">
                      <input
                        type="checkbox"
                        checked={props.getIsColumnVisible(column.id)}
                        disabled={!column.getCanHide()}
                        onChange={(event) =>
                          props.onToggleColumnVisibility(
                            column.id,
                            (event.target as HTMLInputElement).checked,
                          )
                        }
                      />
                      <span>{props.renderColumnLabel(column)}</span>
                    </label>
                    <span class="data-grid__dialog-meta">{column.id}</span>
                  </div>

                  <label class="data-grid__dialog-field">
                    <span>Width</span>
                    <DataGridValidatedNumberInput
                      modelValue={props.getColumnSize(column.id)}
                      min={column.columnDef.minSize ?? 80}
                      rules={[
                        {
                          validate: (value) => value >= (column.columnDef.minSize ?? 80),
                          message: `Minimalna szerokosc to ${column.columnDef.minSize ?? 80}.`,
                        },
                      ]}
                      onCommit={(value) => props.onUpdateColumnSize(column.id, String(value))}
                    />
                  </label>

                  <div class="data-grid__dialog-field">
                    <span>Pin</span>
                    <div class="data-grid__dialog-actions">
                      <button
                        type="button"
                        class={[
                          'data-grid__dialog-action',
                          props.getPinnedSide(column.id) === 'left'
                            ? 'data-grid__dialog-action--active'
                            : '',
                        ]}
                        onClick={() => props.onSetPin(column.id, 'left')}
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        class={[
                          'data-grid__dialog-action',
                          props.getPinnedSide(column.id) === 'right'
                            ? 'data-grid__dialog-action--active'
                            : '',
                        ]}
                        onClick={() => props.onSetPin(column.id, 'right')}
                      >
                        Right
                      </button>
                      <button
                        type="button"
                        class={[
                          'data-grid__dialog-action',
                          !props.getPinnedSide(column.id)
                            ? 'data-grid__dialog-action--active'
                            : '',
                        ]}
                        onClick={() => props.onSetPin(column.id, false)}
                      >
                        None
                      </button>
                    </div>
                  </div>

                  <div class="data-grid__dialog-field">
                    <span>Order</span>
                    <div class="data-grid__dialog-actions">
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() => props.onMoveColumn(column.id, -1)}
                        disabled={index === 0}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() => props.onMoveColumn(column.id, 1)}
                        disabled={index === props.columns.length - 1}
                      >
                        Down
                      </button>
                    </div>
                    <div class="data-grid__dialog-move-row">
                      <select
                        class="data-grid__dialog-select"
                        value={moveTarget}
                        onChange={(event) =>
                          props.onUpdateColumnMoveTarget(
                            column.id,
                            (event.target as HTMLSelectElement).value,
                          )
                        }
                      >
                        {props.columns
                          .filter((candidateColumn) => candidateColumn.id !== column.id)
                          .map((candidateColumn) => (
                            <option key={candidateColumn.id} value={candidateColumn.id}>
                              {props.renderColumnLabel(candidateColumn)}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() => props.onMoveColumnRelative(column.id, moveTarget, 'before')}
                        disabled={!moveTarget}
                      >
                        Before
                      </button>
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() => props.onMoveColumnRelative(column.id, moveTarget, 'after')}
                        disabled={!moveTarget}
                      >
                        After
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </DataGridDialog>
      )
    }
  },
})
