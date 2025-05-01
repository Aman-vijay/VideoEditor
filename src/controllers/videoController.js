const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { ffmpeg } = require("../configs/ffmpeg");
const path = require("path");
const fs = require("fs").promises;
const {convertToSRTAndSave} = require("../utils/convertToSrt.js");
const { createReadStream,existsSync,unlinkSync } = require("fs");

// Helper to fetch video or return 404
const findVideoOrFail = async (id, res) => {
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video) {
    res.status(404).json({ message: "Video not found" });
    return null;
  }
  return video;
};

const uploadVideo = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const diskPath = `src/uploads/${req.file.filename}`;

  ffmpeg.ffprobe(req.file.path, async (err, metadata) => {
    if (err) return res.status(500).json({ message: "Error getting metadata" });

    const duration = Math.floor(metadata.format.duration);
    const size = parseFloat((req.file.size / (1024 * 1024)).toFixed(2));

    try {
      const video = await prisma.video.create({
        data: {
          title: req.file.originalname,
          path: diskPath,
          size,
          mimeType: req.file.mimetype,
          duration,
          status: "uploaded",
        },
      });
      res.status(201).json({ message: "Video uploaded", video });
    } catch (error) {
      res.status(500).json({ message: "DB save failed" });
    }
  });
};

const trimVideo = async (req, res) => {

  const parseTimetoSeconds = (time) => {
    const[hours, minutes, seconds] = time.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }
  const { startTime, endTime } = req.body;
  const videoId = parseInt(req.params.id, 10);

  const video = await findVideoOrFail(videoId, res);
  if (!video) return;
try{
      const startSeconds = parseTimetoSeconds(startTime);
    const endSeconds = parseTimetoSeconds(endTime);

    const duration = endSeconds - startSeconds;
    if (duration <= 0) return res.status(400).json({ message: "Invalid time range" });
    
    const outputPath = `src/uploads/trimmed-${path.basename(video.path)}`;
    const trimmedSize = parseFloat((video.size * duration / video.duration).toFixed(2));
  ffmpeg(video.path)
    .setStartTime(startSeconds)
    .setDuration(duration)
    .output(outputPath)
    .on("end", async () => {
      await prisma.video.update({
        where: { id: videoId },
        data: { path: outputPath, duration, size: trimmedSize, status: "trimmed" },
      });
      res.status(200).json({ message: "Trimmed successfully", outputPath });
    })
    .on("error", () => res.status(500).json({ error: "Trimming failed" }))
    .run();
  }catch (error) {
    console.error("Error during trimming:", error);
    res.status(500).json({ message: "Error during trimming" });
  }
};

const addSubtitles = async (req, res) => {
  try {
    const videoId = parseInt(req.params.id, 10);
    const { subtitles } = req.body;

    if (isNaN(videoId)) return res.status(400).json({ message: "Invalid video ID" });
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      return res.status(400).json({ message: "Subtitles must be a non-empty array" });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) return res.status(404).json({ message: "Video not found" });

    const inputVideoPath = video.path; 
    const uuid = path.basename(video.path, path.extname(video.path)).replace(/^.*-/, "");
    const srtFilename = `subs-${uuid}.srt`;
    const srtPath = path.join("src", "temp", srtFilename);

    // Save .srt to temp folder
    const writtenSrtPath = convertToSRTAndSave({ subtitles }, srtFilename); 

    const outputPath = `src/uploads/sub-${path.basename(video.path)}`;

    console.log("✔ input:", inputVideoPath);
    console.log("✔ srtPath (for ffmpeg):", srtPath);
    console.log("✔ output:", outputPath);

    ffmpeg(inputVideoPath)
      .videoFilters(`subtitles=${srtPath.replace(/\\/g, "/")}`) // relative path; avoid quotes
      .outputOptions(["-c:v", "libx264", "-c:a", "copy", "-y"])
      .output(outputPath)
      .on("start", cmd => console.log("🎬 FFmpeg started:", cmd))
      .on("end", async () => {
        if (existsSync(writtenSrtPath)) unlinkSync(writtenSrtPath);
        await prisma.video.update({
          where: { id: videoId },
          data: { path: outputPath, status: "subtitled" }
        });
        res.status(200).json({ message: "Subtitles added", outputPath });
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg subtitle error:", err.message);
        if (existsSync(writtenSrtPath)) unlinkSync(writtenSrtPath);
        res.status(500).json({ message: "Subtitle rendering failed", error: err.message });
      })
      .run();

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    res.status(500).json({ message: `Unexpected error: ${err.message}` });
  }
};

const renderFinalVideo = async (req, res) => {
  const videoId = parseInt(req.params.id, 10);
  const video = await findVideoOrFail(videoId, res);
  if (!video) return;

  const inputPath = video.path.replace(/\\/g, "/");
  const finalFileName = `final-${Date.now()}-${path.basename(video.path)}`;
  const finalOutputPath = `src/uploads/${finalFileName}`;

  ffmpeg(inputPath)
    .output(finalOutputPath)
    .outputOptions(["-c:v libx264", "-c:a copy", "-y"])
    .on("end", async () => {
      await prisma.video.update({ where: { id: videoId }, data: { path: finalOutputPath, status: "rendered" } });
      res.status(200).json({ message: "Final render complete", path: finalOutputPath });
    })
    .on("error", () => res.status(500).json({ error: "Render failed" }))
    .run();
};

const downloadVideo = async (req, res) => {
  const videoId = parseInt(req.params.id, 10);
  const video = await findVideoOrFail(videoId, res);
  if (!video) return;

  if (video.status !== "rendered") {
    return res.status(400).json({ message: "Video not rendered yet" });
  }

  const absolutePath = path.resolve(video.path);
  const fileName = path.basename(absolutePath);

  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("Content-Type", "video/mp4");
  createReadStream(absolutePath).pipe(res);
};

const getVideos = async (req, res) => {
  try {
    const videos = await prisma.video.findMany();
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

const deleteVideo = async (req, res) => {
  const videoId = parseInt(req.params.id, 10);
  const video = await findVideoOrFail(videoId, res);
  if (!video) return;

  try {
    await prisma.video.delete({ where: { id: videoId } });
    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete video" });
  }
};

const deleteAllVideos = async (req, res) => {
  try {
    await prisma.video.deleteMany();

    const uploadDir = path.resolve("src/uploads");
    const files = await fs.readdir(uploadDir);

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(uploadDir, file);
        await fs.unlink(filePath);
      })
    );

    res.status(200).json({ message: "All videos and files deleted" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  uploadVideo,
  trimVideo,
  addSubtitles,
  renderFinalVideo,
  downloadVideo,
  getVideos,
  deleteVideo,
  deleteAllVideos,
};
