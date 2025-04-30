const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { ffmpeg } = require("../configs/ffmpeg");
const path = require("path");
const fs = require("fs").promises;
const { createReadStream } = require("fs");

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
  const videoId = parseInt(req.params.Id, 10);

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
  const videoId = parseInt(req.params.Id, 10);
  const subtitleFile = req.file;
  if (!subtitleFile) return res.status(400).json({ message: "No subtitle file uploaded" });

  const video = await findVideoOrFail(videoId, res);
  if (!video) return;

  const srtPath = subtitleFile.path.replace(/\\/g, "/");
  const inputVideoPath = video.path.replace(/\\/g, "/");
  const uuid = path.basename(inputVideoPath).split("-").pop().split(".")[0];
  const outputPath = `src/uploads/sub-${uuid}.mp4`;

  ffmpeg(inputVideoPath)
    .outputOptions([`-vf subtitles='${srtPath}'`, "-c:v libx264", "-c:a copy", "-y"])
    .output(outputPath)
    .on("end", async () => {
      await fs.unlink(srtPath);
      await prisma.video.update({ where: { id: videoId }, data: { path: outputPath, status: "subtitled" } });
      res.status(200).json({ message: "Subtitles added", outputPath });
    })
    .on("error", async () => {
      await fs.unlink(srtPath).catch(() => {});
      res.status(500).json({ error: "Subtitle processing failed" });
    })
    .run();
};

const renderFinalVideo = async (req, res) => {
  const videoId = parseInt(req.params.Id, 10);
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
  const videoId = parseInt(req.params.Id, 10);
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
  const videoId = parseInt(req.params.Id, 10);
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
