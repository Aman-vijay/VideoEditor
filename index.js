
const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const videoRoutes = require("./src/routes/videoRoutes.js")





dotenv.config()
const PORT = process.env.PORT

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

app.use(express.urlencoded({
    extended: true,
}));

app.use("/uploads",express.static("uploads"));


app.use(express.json());

app.get("/health",(req,res)=>{
    res.json("All okay")
})

app.use("/api/videos",videoRoutes)


app.listen(PORT,()=>{
    console.log(`Server is listening at ${PORT}`)
})