const upload = require("../configs/multer.js")
const { uploadVideo } = require("../controllers/videoController.js")
const express = require("express")
const router = express.Router()

router.post("/upload",upload.single("video"),uploadVideo)

module.exports = router