import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thoufeeque.socialstudio',
  appName: 'Social Studio',
  webDir: 'out',
  server: {
    // IMPORTANT: Set this to your production URL to use the native shell
    url: 'https://social-studio-app.vercel.app',
    cleartext: true,
    allowNavigation: ['*']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0F172A",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    }
  }
};

export default config;
