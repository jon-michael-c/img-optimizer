import { processImage } from "@/lib/image-processor";
import type { WorkerRequest, WorkerResponse } from "@/lib/worker-pool";

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  let response: WorkerResponse;
  try {
    const result = await processImage(data.file, data.options);
    response = { id: data.id, ok: true, result };
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Could not process this image";
    response = { id: data.id, ok: false, error };
  }
  self.postMessage(response);
};
