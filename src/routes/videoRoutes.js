const upload = require("../configs/multer.js")
const { uploadVideo,trimVideo,getVideos,deleteAllVideos,deleteVideo,addSubtitles ,renderFinalVideo,downloadVideo} = require("../controllers/videoController.js")
const express = require("express")
const router = express.Router()

router.post("/upload",upload.single("video"),uploadVideo)

router.post("/:id/trim", trimVideo)

router.post("/:id/subtitles", addSubtitles)

router.post("/:id/render", renderFinalVideo)

router.get("/:id/download", downloadVideo)

router.get("/getvideos", getVideos)

router.delete("/deleteallvideos", deleteAllVideos)

router.delete("/:id/deleteById", deleteVideo)



module.exports = router