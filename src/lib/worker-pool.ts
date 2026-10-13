import type { ProcessOptions, ProcessResult } from "@/lib/image-processor";

export interface WorkerRequest {
  id: number;
  file: File;
  options: ProcessOptions;
}

export type WorkerResponse =
  | { id: number; ok: true; result: ProcessResult }
  | { id: number; ok: false; error: string };

interface RunOptions {
  signal?: AbortSignal;
  /** Called when a worker picks the job up (it may wait in the queue first). */
  onStart?: () => void;
}

interface Job {
  id: number;
  file: File;
  options: ProcessOptions;
  onStart?: () => void;
  resolve: (result: ProcessResult) => void;
  reject: (reason: unknown) => void;
  detach: () => void;
}

interface Slot {
  worker: Worker | null;
  job: Job | null;
}

// Leave a core for the UI; more workers mostly add memory pressure.
const POOL_SIZE = Math.min(
  4,
  Math.max(1, (navigator.hardwareConcurrency || 4) - 1)
);

class WorkerPool {
  private readonly slots: Slot[] = Array.from({ length: POOL_SIZE }, () => ({
    worker: null,
    job: null,
  }));
  private readonly queue: Job[] = [];
  private nextId = 0;

  run(
    file: File,
    options: ProcessOptions,
    { signal, onStart }: RunOptions = {}
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      const job: Job = {
        id: this.nextId++,
        file,
        options,
        onStart,
        resolve,
        reject,
        detach: () => {},
      };
      if (signal) {
        const onAbort = () => this.cancel(job, signal.reason);
        signal.addEventListener("abort", onAbort, { once: true });
        job.detach = () => signal.removeEventListener("abort", onAbort);
      }
      this.queue.push(job);
      this.dispatch();
    });
  }

  private dispatch() {
    for (const slot of this.slots) {
      if (this.queue.length === 0) return;
      if (slot.job) continue;
      const job = this.queue.shift()!;
      slot.job = job;
      slot.worker ??= this.spawn(slot);
      job.onStart?.();
      slot.worker.postMessage({
        id: job.id,
        file: job.file,
        options: job.options,
      } satisfies WorkerRequest);
    }
  }

  private spawn(slot: Slot): Worker {
    const worker = new Worker(
      new URL("../workers/optimizer.worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const job = slot.job;
      if (!job) return;
      this.release(slot);
      if (e.data.ok) job.resolve(e.data.result);
      else job.reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      const job = slot.job;
      // A crashed worker (e.g. out of memory) is replaced on the next dispatch.
      this.discard(slot);
      job?.reject(new Error(e.message || "The image worker crashed"));
    };
    return worker;
  }

  private release(slot: Slot) {
    slot.job?.detach();
    slot.job = null;
    this.dispatch();
  }

  private discard(slot: Slot) {
    slot.worker?.terminate();
    slot.worker = null;
    this.release(slot);
  }

  private cancel(job: Job, reason: unknown) {
    const index = this.queue.indexOf(job);
    if (index !== -1) {
      this.queue.splice(index, 1);
    } else {
      const slot = this.slots.find((s) => s.job === job);
      if (!slot) return;
      // Terminating is the only way to stop an encode that's in progress.
      this.discard(slot);
    }
    job.reject(reason);
  }
}

let pool: WorkerPool | undefined;

/** Run `processImage` on a background worker, queued behind other jobs. */
export function processInWorker(
  file: File,
  options: ProcessOptions,
  runOptions?: RunOptions
): Promise<ProcessResult> {
  pool ??= new WorkerPool();
  return pool.run(file, options, runOptions);
}
