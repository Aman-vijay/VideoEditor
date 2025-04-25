import { v4 as uuidv4 } from 'uuid'

let videos = []


export const uploadVideo = (req,res)=>{
    const file = req.file
    if(!file){
        return res.status(400).json({message: "No file uploaded"})
    }
    const metaData = {
        id:uuidv4(),
        title: file.originalname,
        path: file.path,
        size: file.size,
        mimeType: file.mimetype,
        status: "uploaded",

    }

    videos.push(metaData)
    return res.status(200).json({
        message: "File uploaded successfully",
        data: metaData
    })
}
