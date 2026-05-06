import {
  createExcelWorkbookBufferFromPayload,
  type DataGridExcelExportPayload,
} from '../utils/excelExport'

type ExcelExportWorkerRequest = {
  id: number
  payload: DataGridExcelExportPayload
}

type ExcelExportWorkerResponse =
  | {
      id: number
      ok: true
      buffer: ArrayBuffer
    }
  | {
      id: number
      ok: false
      error: string
    }

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error || 'Excel export failed.')

const workerScope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ExcelExportWorkerRequest>) => void) | null
  postMessage: (message: ExcelExportWorkerResponse, transfer?: Transferable[]) => void
}

const toArrayBuffer = (buffer: ArrayBuffer | Uint8Array) => {
  if (buffer instanceof ArrayBuffer) return buffer
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(buffer)
  return copy.buffer
}

workerScope.onmessage = async (event: MessageEvent<ExcelExportWorkerRequest>) => {
  const { id, payload } = event.data

  try {
    const buffer = (await createExcelWorkbookBufferFromPayload(payload)) as ArrayBuffer | Uint8Array
    const arrayBuffer = toArrayBuffer(buffer)

    workerScope.postMessage({ id, ok: true, buffer: arrayBuffer } satisfies ExcelExportWorkerResponse, [
      arrayBuffer,
    ])
  } catch (error) {
    workerScope.postMessage({
      id,
      ok: false,
      error: getErrorMessage(error),
    } satisfies ExcelExportWorkerResponse)
  }
}
