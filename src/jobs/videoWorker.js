// src/jobs/videoWorker.js
const { Worker } = require("bullmq");
const IORedis = require("ioredis");

const { processTrimJob } = require("./handlers/trimHandler");
const { processSubtitleJob } = require("./handlers/subtitleHandler");
const { processRenderJob } = require("./handlers/renderHandler");


const connection = new IORedis({
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { type, data } = job.data;
    if (type === "trim") return await processTrimJob(data);
    if (type === "subtitles") return await processSubtitleJob(data);
    if (type === "render") return await processRenderJob(data);
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

module.exports = worker;