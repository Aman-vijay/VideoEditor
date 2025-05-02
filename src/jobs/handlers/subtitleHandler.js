const { PrismaClient } = require("@prisma/client");
const { ffmpeg } = require("../../configs/ffmpeg");
const { convertToSRTAndSave } = require("../../utils/convertToSrt");
const path = require("path");
const { existsSync, unlinkSync } = require("fs");

const prisma = new PrismaClient();

const processSubtitleJob = async ({ videoId, subtitles }) => {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) throw new Error("Video not found");

  const inputPath = video.path;
  const uuid = path.basename(inputPath, path.extname(inputPath)).replace(/^.*-/, "");
  const srtFilename = `subs-${uuid}.srt`;
  const srtPath = path.join("src", "temp", srtFilename);
  const writtenSrtPath = convertToSRTAndSave({ subtitles }, srtFilename);
  const outputPath = `src/uploads/sub-${path.basename(inputPath)}`;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(`subtitles=${srtPath.replace(/\\/g, "/")}`)
      .outputOptions(["-c:v", "libx264", "-c:a", "copy", "-y"])
      .output(outputPath)
      .on("end", async () => {
        if (existsSync(writtenSrtPath)) unlinkSync(writtenSrtPath);
        await prisma.video.update({
          where: { id: videoId },
          data: { path: outputPath, status: "subtitled" },
        });
        resolve("Subtitle render successful");
      })
      .on("error", (err) => {
        console.error("Subtitle error:", err.message);
        if (existsSync(writtenSrtPath)) unlinkSync(writtenSrtPath);
        reject(new Error("Subtitle rendering failed"));
      })
      .run();
  });
};

module.exports = { processSubtitleJob };
