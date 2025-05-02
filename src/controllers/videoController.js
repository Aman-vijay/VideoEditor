const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { ffmpeg } = require("../configs/ffmpeg");
const path = require("path");
const fs = require("fs").promises;
const {convertToSRTAndSave} = require("../utils/convertToSrt.js");
const { createReadStream,existsSync,unlinkSync } = require("fs");
const {videoQueue} = require("../jobs/videoQueue");


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
  const { startTime, endTime } = req.body;
  const videoId = parseInt(req.params.id, 10);

  const video = await findVideoOrFail(videoId, res);
  if (!video) return;

  try {
    await videoQueue.add("trim", {
      type: "trim",
      data: {
        videoId,
        startTime,
        endTime,
      },
    });

    res.status(202).json({ message: "Trim job queued" });
  } catch (err) {
    console.error("Queue error:", err);
    res.status(500).json({ message: "Failed to queue trim job" });
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

   await videoQueue.add("subtitles", {
      type: "subtitles",
      data: {
        videoId,
        subtitles,
      },
    });

    res.status(202).json({ message: "Subtitle job queued" });

  } catch (err) {
    console.error(" Unexpected error:", err);
    res.status(500).json({ message: `Unexpected error: ${err.message}` });
  }
};

const renderFinalVideo = async (req, res) => {
  const videoId = parseInt(req.params.id, 10);
  const video = await findVideoOrFail(videoId, res);
  if (!video) return;
 try {
    await videoQueue.add("render", {
      type: "render",
      data: {
        videoId,
      },
    });

    res.status(202).json({ message: "Render job queued" });
  } catch (err) {
    console.error("Queue error:", err);
    res.status(500).json({ message: "Failed to queue render job" });
  }
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
