const { PrismaClient } = require("@prisma/client"); 
const prisma = new PrismaClient();
const {ffmpeg }= require("../configs/ffmpeg")

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    ffmpeg.ffprobe (req.file.path, async(err, metadata) => {
      if(err){
        console.error("Error getting metadata:", err);
        return res.status(500).json({ message: "Error getting metadata" });
      }

      const durationInSeconds = Math.floor(metadata.format.duration);
      const sizeInMb = parseFloat((req.file.size / (1024 * 1024)).toFixed(2));


    const video = await prisma.video.create({
      data: {
        title: req.file.originalname,
        path: fileUrl,
        size: sizeInMb,
        mimeType: req.file.mimetype,
        duration: durationInSeconds,
        status: "uploaded",
      },
    });

    res.status(201).json({
      message: "Video uploaded and saved to database!",
      video,
    });
  })
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = { uploadVideo };
