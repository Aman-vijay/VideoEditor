const { PrismaClient } = require("@prisma/client");
const { ffmpeg } = require("../../configs/ffmpeg");
const path = require("path");

const prisma = new PrismaClient();

const processRenderJob = async ({ videoId }) => {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error("Video not found");

  const inputPath = video.path.replace(/\\/g, "/");
  const finalFileName = `final-${Date.now()}-${path.basename(video.path)}`;
  const outputPath = `src/uploads/${finalFileName}`;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .outputOptions(["-c:v libx264", "-c:a copy", "-y"])
      .on("end", async () => {
        await prisma.video.update({
          where: { id: videoId },
          data: { path: outputPath, status: "rendered" },
        });
        resolve("Render complete");
      })
      .on("error", (err) => {
        console.error("Render error:", err);
        reject(new Error("Render failed"));
      })
      .run();
  });
};

module.exports = { processRenderJob };
