import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

// Set the ffmpeg path
// Using the most robust resolution by tracing the package source
/**
 * Helper to resolve the FFmpeg binary path at runtime.
 */
const resolveFfmpegPath = () => {
  // Use a hardcoded path relative to process.cwd() as the primary source for Next.js dev
  const localBin = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  if (fs.existsSync(localBin)) return localBin;

  try {
    const ffmpegPkgPath = require.resolve('ffmpeg-static');
    const ffmpegBinPath = path.join(path.dirname(ffmpegPkgPath), 'ffmpeg');
    if (fs.existsSync(ffmpegBinPath)) return ffmpegBinPath;
  } catch (e) {}

  return localBin; // Return the most likely path even if check fails
};

/**
 * Muxes a trending audio track into a video file.
 */
export async function muxAudio(
  videoPath: string,
  audioUrl: string,
  outputPath: string
): Promise<string> {
  const ffmpegPath = resolveFfmpegPath();
  console.log(`[FFmpeg] Runtime Binary Path: ${ffmpegPath}`);
  
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg binary not found at ${ffmpegPath}. Ensure ffmpeg-static is installed.`);
  }

  ffmpeg.setFfmpegPath(ffmpegPath);
  const tempDir = path.dirname(videoPath);
  const audioTempPath = path.join(tempDir, `audio-${Date.now()}.mp3`);

  try {
    // 1. Download the audio file
    console.log(`[FFmpeg] Downloading audio from: ${audioUrl}`);
    const response = await axios({
      url: audioUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(audioTempPath);
    await pipeline(response.data, writer);

    // Verify files exist and have content
    const videoStats = fs.statSync(videoPath);
    const audioStats = fs.statSync(audioTempPath);
    console.log(`[FFmpeg] Video Input: ${videoPath} (${videoStats.size} bytes)`);
    console.log(`[FFmpeg] Audio Input: ${audioTempPath} (${audioStats.size} bytes)`);

    if (audioStats.size === 0) {
      throw new Error("Downloaded audio file is empty.");
    }

    // 2. Perform Muxing
    console.log(`[FFmpeg] Starting muxing: ${videoPath} + ${audioTempPath} -> ${outputPath}`);
    
    return new Promise((resolve, reject) => {
      let ffmpegError = '';
      
      ffmpeg(videoPath)
        .input(audioTempPath)
        // -y: Overwrite output file
        // -c:v copy: Copy video codec (no re-encode)
        // -c:a aac: Encode audio to AAC for maximum compatibility with MP4
        // -map 0:v:0: Map first video stream from first input
        // -map 1:a:0: Map first audio stream from second input (the mp3)
        // -shortest: End when the shortest stream ends
        .outputOptions([
          '-y',
          '-c:v copy',
          '-c:a aac',
          '-map 0:v:0',
          '-map 1:a:0',
          '-shortest'
        ])
        .on('start', (commandLine) => {
          console.log('🚀 Executing FFmpeg: ' + commandLine);
        })
        .on('stderr', (stderrLine) => {
          // Log stderr for debugging if needed, but don't overwhelm console
          ffmpegError += stderrLine + '\n';
        })
        .on('error', (err) => {
          console.error('❌ Muxing Failed!');
          console.error('FFmpeg Stderr Output:\n' + ffmpegError);
          reject(new Error(`FFmpeg Error: ${err.message}\n${ffmpegError}`));
        })
        .on('end', () => {
          console.log('✅ Muxing finished successfully!');
          // Cleanup audio temp
          if (fs.existsSync(audioTempPath)) {
            fs.unlinkSync(audioTempPath);
          }
          resolve(outputPath);
        })
        .save(outputPath);
    });
  } catch (error) {
    // Cleanup if something fails
    if (fs.existsSync(audioTempPath)) {
      fs.unlinkSync(audioTempPath);
    }
    throw error;
  }
}
