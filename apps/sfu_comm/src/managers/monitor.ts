import { workerManager } from "./WorkerManager.js";
import { redisService } from "../services/RedisService.js";

export const startMonitoring = () => {
  setInterval(async () => {
    let totalTrasports = 0;

    for (const worker of workerManager.getWorker()) {
      const db = await worker.getResourceUsage();
      totalTrasports += (await worker.dump()).routerIds.length;
    }

    await redisService.updateNodeLoad(process.env.MY_IP!, totalTrasports);
    console.log(`current node load is ${totalTrasports} active routers`);
  }, 5000);
};
