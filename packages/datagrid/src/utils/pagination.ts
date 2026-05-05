export type PaginationItem = { type: 'page'; value: number } | { type: 'ellipsis'; key: string }

export function buildPaginationItems(pageCount: number, pageIndex: number): PaginationItem[] {
  if (pageCount <= 0) {
    return []
  }

  if (pageCount <= 8) {
    return Array.from({ length: pageCount }, (_, index) => ({
      type: 'page',
      value: index,
    }))
  }

  const pages = new Set<number>()
  pages.add(0)
  pages.add(pageCount - 1)

  if (pageIndex <= 3) {
    for (let index = 0; index <= 5; index += 1) {
      pages.add(index)
    }
  } else if (pageIndex >= pageCount - 4) {
    for (let index = pageCount - 6; index < pageCount; index += 1) {
      pages.add(index)
    }
  } else {
    for (let index = pageIndex - 2; index <= pageIndex + 2; index += 1) {
      pages.add(index)
    }
  }

  const orderedPages = Array.from(pages).sort((left, right) => left - right)
  const items: PaginationItem[] = []

  for (let index = 0; index < orderedPages.length; index += 1) {
    const page = orderedPages[index]
    if (typeof page !== 'number') {
      continue
    }

    items.push({
      type: 'page',
      value: page,
    })

    const nextPage = orderedPages[index + 1]
    if (typeof nextPage === 'number' && nextPage - page > 1) {
      items.push({
        type: 'ellipsis',
        key: `ellipsis-${page}-${nextPage}`,
      })
    }
  }

  return items
}
