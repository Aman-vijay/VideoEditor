// src/jobs/videoQueue.js
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({
    maxRetriesPerRequest: null,
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
}); // <--- Use ioredis here

const videoQueue = new Queue("video-processing", { connection });

module.exports = { videoQueue };
