const { PrismaClient } = require("@prisma/client");
const { ffmpeg } = require("../../configs/ffmpeg");
const path = require("path");
const prisma = new PrismaClient();

const parseTimeToSeconds = (time) => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const processTrimJob = async ({ videoId, startTime, endTime }) => {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error("Video not found");

  const startSeconds = parseTimeToSeconds(startTime);
  const endSeconds = parseTimeToSeconds(endTime);
  const duration = endSeconds - startSeconds;

  if (duration <= 0) throw new Error("Invalid duration");

  const outputPath = `src/uploads/trimmed-${path.basename(video.path)}`;
  const trimmedSize = parseFloat((video.size * duration / video.duration).toFixed(2));

  return new Promise((resolve, reject) => {
    ffmpeg(video.path)
      .setStartTime(startSeconds)
      .setDuration(duration)
      .output(outputPath)
      .on("end", async () => {
        await prisma.video.update({
          where: { id: videoId },
          data: { path: outputPath, duration, size: trimmedSize, status: "trimmed" },
        });
        resolve("Trim successful");
      })
      .on("error", (err) => {
        console.error("Trim error:", err);
        reject(new Error("Trimming failed"));
      })
      .run();
  });
};

module.exports = { processTrimJob };
