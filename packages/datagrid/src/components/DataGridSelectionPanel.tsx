import { defineComponent, onBeforeUnmount, ref, type PropType } from 'vue'

import type { DataGridSelectionPanelPosition } from '../types'

type SumItem = {
  columnId: string
  label: string
  value: string
}

export default defineComponent({
  name: 'DataGridSelectionPanel',
  props: {
    position: {
      type: String as PropType<DataGridSelectionPanelPosition>,
      required: true,
    },
    selectedRowsCount: {
      type: Number,
      required: true,
    },
    selectedRowsLabel: {
      type: String,
      required: true,
    },
    sums: {
      type: Array as PropType<SumItem[]>,
      required: true,
    },
    copyWithHeadersLabel: {
      type: String,
      required: true,
    },
    copyWithoutHeadersLabel: {
      type: String,
      required: true,
    },
    onCopyWithHeaders: {
      type: Function as PropType<() => void | Promise<void>>,
      required: true,
    },
    onCopyWithoutHeaders: {
      type: Function as PropType<() => void | Promise<void>>,
      required: true,
    },
  },
  setup(props) {
    const copiedButton = ref<'withHeaders' | 'withoutHeaders' | null>(null)
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    function showCopiedState(target: 'withHeaders' | 'withoutHeaders') {
      copiedButton.value = target

      if (resetTimer) {
        clearTimeout(resetTimer)
      }

      resetTimer = setTimeout(() => {
        copiedButton.value = null
      }, 1400)
    }

    async function handleCopy(target: 'withHeaders' | 'withoutHeaders') {
      if (target === 'withHeaders') {
        await props.onCopyWithHeaders()
      } else {
        await props.onCopyWithoutHeaders()
      }

      showCopiedState(target)
    }

    onBeforeUnmount(() => {
      if (resetTimer) {
        clearTimeout(resetTimer)
      }
    })

    return () => (
      <div
        class={[
          'data-grid__selection-panel',
          `data-grid__selection-panel--${props.position}`,
        ]}
      >
        <div class="data-grid__selection-panel-main">
          <span class="data-grid__selection-panel-count">
            {props.selectedRowsLabel}: {props.selectedRowsCount}
          </span>
          {props.sums.length > 0 ? (
            <div class="data-grid__selection-panel-sums">
              {props.sums.map((sum) => (
                <span key={sum.columnId} class="data-grid__selection-panel-sum">
                  {sum.label}: {sum.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div class="data-grid__selection-panel-actions">
          <button
            type="button"
            class={[
              'data-grid__selection-panel-button',
              copiedButton.value === 'withHeaders'
                ? 'data-grid__selection-panel-button--success'
                : '',
            ]}
            onClick={() => {
              void handleCopy('withHeaders')
            }}
          >
            {copiedButton.value === 'withHeaders' ? 'Skopiowano' : props.copyWithHeadersLabel}
          </button>
          <button
            type="button"
            class={[
              'data-grid__selection-panel-button',
              copiedButton.value === 'withoutHeaders'
                ? 'data-grid__selection-panel-button--success'
                : '',
            ]}
            onClick={() => {
              void handleCopy('withoutHeaders')
            }}
          >
            {copiedButton.value === 'withoutHeaders'
              ? 'Skopiowano'
              : props.copyWithoutHeadersLabel}
          </button>
        </div>
      </div>
    )
  },
})
