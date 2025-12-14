// allows horizontal scaling in one machine

import mediasoup from "mediasoup";
import os from "os";
import { config } from "../config.js";

const workers: mediasoup.types.Worker[] = [];
let nextWorkerIndex = 0;

export async function createWorkers() {
  const cpuCount = os.cpus().length;

  for (let i = 0; i < cpuCount; i++) {
    const worker = await mediasoup.createWorker({
      rtcMinPort: config.mediasoup.worker.rtcMinPort,
      rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    worker.on("died", () => {
      console.error(
        "mediasoup worker died, exiting in 2 seconds... [pid:%d]",
        worker.pid
      );
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
  }
}

export function getWorker(): any {
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
  return worker;
}
