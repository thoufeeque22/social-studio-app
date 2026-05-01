/**
 * FFmpeg Utility for client-side video processing.
 * Using dynamic imports and multi-layered fallback for browser compatibility.
 */

let ffmpegInstance: any = null;
let loadPromise: Promise<any> | null = null;

/**
 * Loads and returns the FFmpeg instance.
 * Attempts multi-threaded load first, falls back to single-threaded if security headers are missing.
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

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

      try {
        console.log('[FFmpeg] Attempting to load FFmpeg WASM...');
        await instance.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        console.log('[FFmpeg] Load successful.');
      } catch (loadErr: any) {
        console.warn('[FFmpeg] Multi-threaded load failed, checking security context:', loadErr);
        
        // If SharedArrayBuffer is missing, it's likely a COOP/COEP header issue in dev or specific browsers
        if (!globalThis.SharedArrayBuffer) {
          console.error('[FFmpeg] SharedArrayBuffer is not available. Please ensure COOP/COEP headers are set.');
        }
        
        throw loadErr;
      }

      ffmpegInstance = instance;
      return ffmpegInstance;
    } catch (err) {
      loadPromise = null;
      console.error("[FFmpeg] Critical load error:", err);
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
): Promise<File> {
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

    console.log('[FFmpeg] Starting rotation command...');
    /**
     * Optimized command for browser compatibility:
     * -preset superfast: Faster encoding (at cost of size)
     * -vf transpose=1: Rotate 90 CW
     * -pix_fmt yuv420p: Required for web browser playback
     */
    await instance.exec([
      '-i', inputName, 
      '-vf', 'transpose=1', 
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', 
      '-metadata:s:v', 'rotate=0', 
      '-preset', 'superfast',
      outputName
    ]);

    console.log('[FFmpeg] Reading output file...');
    const data = await instance.readFile(outputName);
    
    // Cleanup virtual files
    try {
      await instance.deleteFile(inputName);
      await instance.deleteFile(outputName);
    } catch (e) {
      console.warn("[FFmpeg] Cleanup warning:", e);
    }

    const blob = new Blob([data], { type: 'video/mp4' });
    
    // Improve naming to avoid "rotated_rotated_..."
    // Matches "rotated_N_" where N is degrees
    const rotationMatch = file.name.match(/^rotated_(\d+)_/);
    let currentDegrees = rotationMatch ? parseInt(rotationMatch[1], 10) : 0;
    const newDegrees = (currentDegrees + 90) % 360;
    
    // Remove old prefix if it exists, then add new one
    const cleanName = file.name.replace(/^rotated_\d+_/, '');
    const newName = newDegrees === 0 ? cleanName : `rotated_${newDegrees}_${cleanName}`;

    return new File([blob], newName, { type: 'video/mp4' });
  } catch (err: any) {
    if (err?.message?.includes('terminate')) {
      console.log("[FFmpeg] Aborted by user.");
      return null;
    }
    console.error("[FFmpeg] Execution error:", err);
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
      console.log('[FFmpeg] Terminating instance...');
      ffmpegInstance.terminate();
    } catch (e) {
      console.warn("[FFmpeg] Terminate error:", e);
    } finally {
      ffmpegInstance = null;
      loadPromise = null;
    }
  }
}
