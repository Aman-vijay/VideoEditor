const { PrismaClient } = require("@prisma/client"); 
const prisma = new PrismaClient();
const {ffmpeg }= require("../configs/ffmpeg")
const path = require("path");

const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const diskPath = `src/uploads/${req.file.filename}`

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
        path: diskPath,
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

const trimVideo = async (req, res) => {
  const { startTime, endTime } = req.body;
  const { Id } = req.params;
  const videoId = parseInt(Id, 10); // Convert to integer

  try{
    const video = await prisma.video.findUnique({
      where: { id:videoId },
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const outputPath = `src/uploads/trimmed-${video.path.split("/").pop()}`; 

   ffmpeg(video.path)
   .setStartTime(startTime)
    .setDuration(endTime - startTime)
    .output(outputPath)
    .on("end", async () => {
       await prisma.video.update({
        where: { id: videoId },
        data: {
          path: outputPath,
          duration: endTime - startTime,
          size: parseFloat((video.size * (endTime - startTime) / video.duration).toFixed(2)), 
          status: "trimmed",
        },
      });

      res.status(200).json({ message: "Trimmed successfully", outputPath });
    })
    .on("error", (err) => {
      console.error("Trim error:", err);
      res.status(500).json({ error: "Trimming failed" });
    })
    .run();

}
  catch(error){
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

const getVideos = async(req,res)=>{
  try {
    const videos = await prisma.video.findMany();
    res.status(200).json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

const deleteAllVideos = async(req,res)=>{
  try {
    await prisma.video.deleteMany({});
    res.status(200).json({ message: "All videos deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}
const deleteVideo = async(req,res)=>{
  const { Id } = req.params;
  const videoId = parseInt(Id, 10); // Convert to integer

  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    await prisma.video.delete({
      where: { id: videoId },
    });

    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
}

const addSubtitles = async (req, res) => {
  const { Id } = req.params;
  const videoId = parseInt(Id, 10);
  const subtitleFile = req.file;

  if (!subtitleFile) {
    return res.status(400).json({ message: "No subtitle file uploaded" });
  }

  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    const srtPath = subtitleFile.path.replace(/\\/g, "/");
    const inputVideoPath = video.path.replace(/\\/g, "/");
    

    const uuid = path.basename(inputVideoPath).split("-").pop().split(".")[0];
    const outputPath = `src/uploads/sub-${uuid}.mp4`;

    ffmpeg(inputVideoPath)
      .outputOptions([
        `-vf subtitles='${srtPath}'`,
        "-c:v libx264", 
        "-c:a copy", 
        "-y", 
      ])
      .output(outputPath)
      .on("end", async () => {
        await prisma.video.update({
          where: { id: videoId },
          data: {
            path: outputPath,
            status: "subtitled",
          },
        });
        res.status(200).json({ message: "Subtitles added successfully", outputPath });
      })
      .on("error", (err) => {
        res.status(500).json({ error: "Adding subtitles failed" });
      })
      .run();
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};


module.exports = { uploadVideo, trimVideo,getVideos,deleteAllVideos,deleteVideo,addSubtitles };
