
# VideoEditor

A simple video editing service using Node.js, Prisma, and FFmpeg. This application allows users to upload, trim, add subtitles, render final videos, and download them. All video data is stored in a PostgreSQL database and managed through Prisma.



## Features

- Upload videos: Users can upload videos, which will be stored and metadata (such as size, duration, and MIME type) is saved in the database.
- Trim videos: Users can specify start and end times to trim videos.
- Add subtitles: Users can add subtitles to a video.
- Render final video: After trimming or adding subtitles, the video can be rendered to create the final output.
- Download videos: Rendered videos can be downloaded.
- List all videos: View a list of all uploaded videos.
- Delete individual videos: Delete videos by ID.
- Delete all videos: Delete all videos and associated files.


















## Installation

Prerequisites
- Node.js
- Docker
- PostgreSQL (for database)
- FFmpeg (for video processing)

1. Clone the repository:
```bash
git clone https://github.com/your-username/video-editor.git
cd video-editor
```
2. Install dependencies using pnpm/npm:
```bash
pnpm install

```
3. Set up the database using Prisma:
Run the following command to migrate the database schema:
```bash
pnpm prisma migrate dev

```
4. Start the application:
```bash
pnpm start

```
5. For PostgreSQL If using Docker, you can run the application using Docker Compose:
```bash
docker-compose up --build

```
    
## Configuration
The project contains various configuration files for setting up FFmpeg, Multer (for file upload handling), and the database connection.

- src/configs/db.js: This file configures the PostgreSQL database connection using Prisma.

- src/configs/ffmpeg.js: Configuration for FFmpeg to handle video processing tasks.

- src/configs/multer.js: Middleware for handling video file uploads.

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`PORT`

`DATABASE_UTL:"postgresql://USER:password@port/videoeditor"`


## API Reference

#### Upload video

```http
  POST /api/videos/upload
```

| Parameter | Type     | Description                        |
| :-------- | :------- | :--------------------------------- |
| `video`   | `file`   | **Required**. Video file to upload |

#### Video Trimming 

```http
 POST /api/videos/:id/trim
```

| Parameter   | Type     | Description                     |
| :---------- | :------- | :------------------------------ |
| `id`        | `string` | **Required**. Video ID to trim  |
| `startTime` | `string` | **Required**. Trim start time   |
| `endTime`   | `string` | **Required**. Trim end time     |

### Add subtitles
```http
 POST /api/videos/:id/subtitles
```
| Parameter  | Type     | Description                         |
| :--------- | :------- | :---------------------------------- |
| `id`       | `string` | **Required**. Video ID to subtitle  |
| `subtitles`| `array`  | **Required**. Array of subtitle objects (start, end, text) |

#### Render final video
```http
 POST /api/videos/:id/render
```
| Parameter | Type     | Description                        |
| :-------- | :------- | :--------------------------------- |
| `id`      | `string` | **Required**. Video ID to render   |

#### Download video
```http
 GET /api/videos/:id/download
```
| Parameter | Type     | Description                        |
| :-------- | :------- | :--------------------------------- |
| `id`      | `string` | **Required**. Video ID to download |

#### Get all videos

```http
 GET /api/videos/getvideos

```
| Parameter | Type | Description |
| :-------- | :--- | :---------- |
| _None_    | —    | Returns list of all uploaded videos |

#### Delete Video by id
```http
 DELETE /api/videos/:id/deletebyid
```
| Parameter | Type     | Description                      |
| :-------- | :------- | :------------------------------- |
| `id`      | `string` | **Required**. Video ID to delete |

#### Delete

```http
 DELETE /api/videos/deleteallvideos

```
| Parameter | Type | Description           |
| :-------- | :--- | :-------------------- |
| _None_    | —    | Deletes all videos    |
