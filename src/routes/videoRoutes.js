import upload from "../configs/multer.js";
import { uploadVideo } from "../controllers/videoController.js";
import express from "express";

const router = express.Router()

router.post("/upload",upload.single("video"),uploadVideo)

export default router;