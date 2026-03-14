import * as mediasoup from "mediasoup";
import { config } from "../config/mediasoup.js";

class WorkerManager {
  private workers: mediasoup.types.Worker[] = [];
  private nextWorkerIndex = 0;

  constructor() {}

  async init() {
    for (let i = 0; i < config.mediasoup.numWorkers; i++) {
      const worker = await mediasoup.createWorker(
        config.mediasoup.workerSettings,
      );

      worker.on("died", () => {
        console.error("Mediasoup worker died, existing in 2 seconds...");
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      console.log("Worker initialized", i);
    }
  }

  getWorker(): any {
    const worker = this.workers[this.nextWorkerIndex]!;
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRouter(): Promise<mediasoup.types.Router> {
    const worker = this.getWorker();
    return await worker.createRouter(config.mediasoup.routerOptions);
  }
}

export const workerManager = new WorkerManager();
