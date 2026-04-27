/**
 * VIDEO ANALYSIS UTILITY
 * Extracts frames from a video file for multimodal AI analysis.
 */

export async function extractVideoFrames(file: File, frameCount: number = 3): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        const interval = duration / (frameCount + 1);
        
        for (let i = 1; i <= frameCount; i++) {
          const time = i * interval;
          video.currentTime = time;
          
          await new Promise((res, rej) => {
            const timeout = setTimeout(() => rej(new Error("Timeout seeking video frame")), 2000);
            video.onseeked = () => {
              clearTimeout(timeout);
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = Math.min(video.videoWidth, 800); // Max width for analysis
                canvas.height = (video.videoHeight / video.videoWidth) * canvas.width;
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL('image/jpeg', 0.6));
              }
              res(true);
            };
          });
        }
        
        cleanup();
        resolve(frames);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
      canvas.remove();
    };

    video.onerror = () => reject(new Error("Failed to load video for scanning."));
    video.src = URL.createObjectURL(file);
  });
}
