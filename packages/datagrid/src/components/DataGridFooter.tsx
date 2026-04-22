import { defineComponent, type PropType } from 'vue'

import type { DataGridMetaConfig, DataGridPageSizeConfig } from '../types'

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
            {'<'}
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
            {'>'}
          </button>
        </div>

        <label class="data-grid__page-size data-grid__footer-section data-grid__footer-section--page-size">
          <span>{props.pageSizeConfig.label ?? 'Rows'}</span>
          <select
            value={String(props.pageSize)}
            onChange={(event) =>
              props.onPageSizeChange(Number((event.target as HTMLSelectElement).value))
            }
          >
            {(props.pageSizeConfig.options ?? [50, 100, 250, 500]).map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  },
})
