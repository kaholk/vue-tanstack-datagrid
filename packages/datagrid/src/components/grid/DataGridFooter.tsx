import { defineComponent, ref, type PropType } from 'vue'
import IconArrowBackRounded from '~icons/material-symbols/arrow-back-rounded'
import IconArrowForwardRounded from '~icons/material-symbols/arrow-forward-rounded'

import type { DataGridMetaConfig, DataGridPageSizeConfig } from '../../types'
import DataGridDropdownMenu from '../menus/DataGridDropdownMenu'

type PaginationItem =
  | { type: 'page'; value: number }
  | { type: 'ellipsis'; key: string }

export default defineComponent({
  name: 'DataGridFooter',
  props: {
    isLoading: {
      type: Boolean,
      required: true,
    },
    totalRows: {
      type: Number,
      required: true,
    },
    fetchedRows: {
      type: Number,
      required: true,
    },
    datasetSize: {
      type: [String, Number] as PropType<string | number | undefined>,
      default: undefined,
    },
    metaItems: {
      type: Array as PropType<DataGridMetaConfig[]>,
      required: true,
    },
    pageSizeConfig: {
      type: Object as PropType<DataGridPageSizeConfig>,
      required: true,
    },
    pageIndex: {
      type: Number,
      required: true,
    },
    pageSize: {
      type: Number,
      required: true,
    },
    paginationItems: {
      type: Array as PropType<PaginationItem[]>,
      required: true,
    },
    canPreviousPage: {
      type: Boolean,
      required: true,
    },
    canNextPage: {
      type: Boolean,
      required: true,
    },
    onPreviousPage: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onNextPage: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onSetPageIndex: {
      type: Function as PropType<(pageIndex: number) => void>,
      required: true,
    },
    onPageSizeChange: {
      type: Function as PropType<(pageSize: number) => void>,
      required: true,
    },
  },
  setup(props) {
    const isPageSizeOpen = ref(false)
    const pageSizeTriggerRef = ref<HTMLButtonElement | null>(null)

    function handlePageSizeChange(pageSize: number) {
      props.onPageSizeChange(pageSize)
      isPageSizeOpen.value = false
    }

    return () => (
      <div class="data-grid__footer">
        <div class="data-grid__meta data-grid__footer-section data-grid__footer-section--meta">
          {props.metaItems.map((item) => {
            if (item.key === 'datasetSize' && !props.datasetSize) {
              return null
            }

            if (item.key === 'rows') {
              return (
                <span key={item.key}>
                  {props.isLoading
                    ? 'Loading...'
                    : `${item.label ?? 'Rows'}: ${props.totalRows}`}
                </span>
              )
            }

            if (item.key === 'fetched') {
              return <span key={item.key}>{`${item.label ?? 'Fetched'}: ${props.fetchedRows}`}</span>
            }

            return <span key={item.key}>{`${item.label ?? 'Dataset'}: ${props.datasetSize}`}</span>
          })}
        </div>

        <div class="data-grid__pagination data-grid__footer-section data-grid__footer-section--pagination">
          <button
            type="button"
            class="data-grid__pagination-nav"
            onClick={props.onPreviousPage}
            disabled={!props.canPreviousPage}
            aria-label="Previous page"
          >
            <IconArrowBackRounded class="data-grid__icon" />
          </button>
          <div class="data-grid__pagination-pages" aria-label="Pagination">
            {props.paginationItems.map((item) =>
              item.type === 'ellipsis' ? (
                <span key={item.key} class="data-grid__pagination-ellipsis" aria-hidden="true">
                  ...
                </span>
              ) : (
                <button
                  key={item.value}
                  type="button"
                  class={[
                    'data-grid__pagination-page',
                    item.value === props.pageIndex ? 'data-grid__pagination-page--active' : '',
                  ]}
                  onClick={() => props.onSetPageIndex(item.value)}
                  aria-current={item.value === props.pageIndex ? 'page' : undefined}
                  aria-label={`Page ${item.value + 1}`}
                >
                  {item.value + 1}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            class="data-grid__pagination-nav"
            onClick={props.onNextPage}
            disabled={!props.canNextPage}
            aria-label="Next page"
          >
            <IconArrowForwardRounded class="data-grid__icon" />
          </button>
        </div>

        <div class="data-grid__page-size data-grid__footer-section data-grid__footer-section--page-size">
          <span>{props.pageSizeConfig.label ?? 'Rows'}</span>
          <button
            ref={pageSizeTriggerRef}
            type="button"
            class="data-grid__page-size-trigger"
            data-grid-page-size-root="true"
            aria-haspopup="listbox"
            aria-expanded={isPageSizeOpen.value}
            onClick={(event) => {
              event.stopPropagation()
              isPageSizeOpen.value = !isPageSizeOpen.value
            }}
          >
            {props.pageSize}
          </button>
          {isPageSizeOpen.value ? (
            <DataGridDropdownMenu
              triggerRef={pageSizeTriggerRef}
              teleport
              menuClass="data-grid__page-size-menu"
              scopeAttr="data-grid-page-size-root"
              minWidth={96}
              desiredHeight={240}
              minAvailableHeight={120}
              viewportMargin={8}
              offset={6}
              zIndex={220}
              outsideClickRootAttr="data-grid-page-size-root"
              onOutsidePointerDown={() => {
                isPageSizeOpen.value = false
              }}
            >
              <div class="data-grid__page-size-options" role="listbox" data-grid-page-size-root="true">
                {(props.pageSizeConfig.options ?? [50, 100, 250, 500]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    data-grid-page-size-root="true"
                    class={[
                      'data-grid__page-size-option',
                      size === props.pageSize ? 'data-grid__page-size-option--active' : '',
                    ]}
                    role="option"
                    aria-selected={size === props.pageSize}
                    onClick={() => handlePageSizeChange(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </DataGridDropdownMenu>
          ) : null}
        </div>
      </div>
    )
  },
})
