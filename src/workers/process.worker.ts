import { describeError } from '../lib/errors'
import { runPipeline, type ProcessRequest } from '../lib/pipeline'

const port = self as unknown as Worker

port.addEventListener('message', async (event: MessageEvent<ProcessRequest>) => {
  const request = event.data
  try {
    const output = await runPipeline(request.source, request.plan)
    port.postMessage({
      id: request.id,
      ok: true,
      blob: output.blob,
      width: output.width,
      height: output.height,
      mime: output.mime
    })
  } catch (error) {
    port.postMessage({ id: request.id, ok: false, error: describeError(error) })
  }
})
