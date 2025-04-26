const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");


const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,"./src/uploads")
    },
    filename: function(req,file,cb){
        cb(null,file.fieldname+"-"+ uuidv4()+path.extname(file.originalname))

    }
    
    
})

//Multer config

const upload = multer({
    storage: storage
})


module.exports = upload