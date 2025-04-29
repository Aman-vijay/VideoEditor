const upload = require("../configs/multer.js")
const { uploadVideo,trimVideo,getVideos,deleteAllVideos,deleteVideo,addSubtitles ,renderFinalVideo,downloadVideo} = require("../controllers/videoController.js")
const express = require("express")
const router = express.Router()

router.post("/upload",upload.single("video"),uploadVideo)

router.post("/trim/:Id", trimVideo)

router.get("/getvideos", getVideos)

router.delete("/deleteallvideos", deleteAllVideos)

router.delete("/deletevideo/:Id", deleteVideo)

router.post("/addsubtitles/:Id", upload.single("subtitles"), addSubtitles)

router.post("/renderfinalvideo/:Id", renderFinalVideo)

router.get("/downloadvideo/:Id", downloadVideo)
module.exports = router