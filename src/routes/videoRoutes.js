const upload = require("../configs/multer.js")
const { uploadVideo,trimVideo,getVideos,deleteAllVideos,deleteVideo,addSubtitles } = require("../controllers/videoController.js")
const express = require("express")
const router = express.Router()

router.post("/upload",upload.single("video"),uploadVideo)

router.post("/trim/:Id", trimVideo)

router.get("/getvideos", getVideos)

router.delete("/deleteallvideos", deleteAllVideos)

router.delete("/deletevideo/:Id", deleteVideo)

router.post("/addsubtitles/:Id", upload.single("subtitles"), addSubtitles)

module.exports = router