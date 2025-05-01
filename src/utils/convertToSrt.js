const fs = require('fs');
const os = require('os');
const path = require('path');

const convertToSRTAndSave=(subtitleData, filename = 'subtitles.srt')=> {
    // Validate input
    if (!subtitleData || !subtitleData.subtitles || !Array.isArray(subtitleData.subtitles)) {
        throw new Error('Invalid subtitle data format');
    }

    // Generate SRT content
    let srtContent = '';
    subtitleData.subtitles.forEach((subtitle, index) => {
        // Validate subtitle entry
        if (!subtitle.text || !subtitle.start || !subtitle.end) {
            console.warn(`Skipping invalid subtitle entry at index ${index}`);
            return;
        }

        // Convert time format if needed (assuming input is already in HH:MM:SS format)
        const startTime = subtitle.start.includes(',') ? subtitle.start : `${subtitle.start},000`;
        const endTime = subtitle.end.includes(',') ? subtitle.end : `${subtitle.end},000`;

        // Add SRT block
        srtContent += `${index + 1}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${subtitle.text}\n\n`;
    });

    // Define the specific output directory
    const outputDir = 'C:\\Users\\Aman Vj\\Desktop\\VideoEditor\\src\\temp';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write SRT file
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, srtContent, 'utf8');

    return filePath;
}

module.exports = {convertToSRTAndSave};