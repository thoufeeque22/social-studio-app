/**
 * FFmpeg Utility for client-side video processing.
 * Optimized for performance and hardware acceleration where available.
 */

let ffmpegInstance: any = null;
let loadPromise: Promise<any> | null = null;

/**
 * Loads and returns the FFmpeg instance.
 */
async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');

      const instance = new FFmpeg();

      instance.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      // Use a version of core that supports multi-threading if possible
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

      console.log('[FFmpeg] Initializing WASM worker...');
      await instance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegInstance = instance;
      return ffmpegInstance;
    } catch (err) {
      loadPromise = null;
      console.error("[FFmpeg] Initialization failed:", err);
      throw err;
    }
  })();

  return loadPromise;
}

/**
 * Rotates a video file 90 degrees clockwise using FFmpeg WASM.
 */
export async function rotateVideo(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<File | null> {
  const instance = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(progress);
  };

  instance.on('progress', progressHandler);

  const inputName = 'input_video';
  const outputName = 'output_video.mp4';

  try {
    console.log('[FFmpeg] Writing file to memory...');
    await instance.writeFile(inputName, await fetchFile(file));

    console.log('[FFmpeg] Starting high-speed rotation...');
    /**
     * OPTIMIZATION STRATEGY:
     * -preset ultrafast: Maximum speed, minimum CPU usage (larger file size but worth it for UX)
     * -threads 0: Auto-detect CPU cores for multi-threaded processing
     * -pix_fmt yuv420p: Compatibility
     * -tune fastdecode: Specifically optimizes for playback speed
     */
    await instance.exec([
      '-i', inputName, 
      '-vf', 'transpose=1', 
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', 
      '-metadata:s:v', 'rotate=0', 
      '-preset', 'ultrafast',
      '-tune', 'fastdecode',
      '-threads', '0', 
      outputName
    ]);

    console.log('[FFmpeg] Processing complete.');
    const data = await instance.readFile(outputName);
    
    // Cleanup
    try {
      await instance.deleteFile(inputName);
      await instance.deleteFile(outputName);
    } catch (e) {
      console.warn("[FFmpeg] Cleanup ignored:", e);
    }

    const blob = new Blob([data], { type: 'video/mp4' });
    
    // Descriptive naming
    const rotationMatch = file.name.match(/^rotated_(\d+)_/);
    let currentDegrees = rotationMatch ? parseInt(rotationMatch[1], 10) : 0;
    const newDegrees = (currentDegrees + 90) % 360;
    const cleanName = file.name.replace(/^rotated_\d+_/, '');
    const newName = newDegrees === 0 ? cleanName : `rotated_${newDegrees}_${cleanName}`;

    return new File([blob], newName, { type: 'video/mp4' });
  } catch (err: any) {
    if (err?.message?.includes('terminate')) {
      console.log("[FFmpeg] Cancelled by user.");
      return null;
    }
    console.error("[FFmpeg] Command failed:", err);
    throw err;
  } finally {
    instance.off('progress', progressHandler);
  }
}

/**
 * Forcefully terminates the FFmpeg instance.
 */
export async function terminateVideoRotation() {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch (e) {
      console.warn("[FFmpeg] Terminate warning:", e);
    } finally {
      ffmpegInstance = null;
      loadPromise = null;
    }
  }
}
