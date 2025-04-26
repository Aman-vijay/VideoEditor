const { PrismaClient } = require("@prisma/client"); 
const prisma = new PrismaClient();

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;


    const video = await prisma.video.create({
      data: {
        title: req.file.originalname,
        path: fileUrl,
        size: req.file.size,
        mimeType: req.file.mimetype,
        status: "uploaded",
      },
    });

    res.status(201).json({
      message: "Video uploaded and saved to database!",
      video,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = { uploadVideo };
