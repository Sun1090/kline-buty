import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.klinebuty.chart',
  appName: 'Kline Buty',
  webDir: 'www',
  plugins: {
    // 启动屏保持深色底，避免 Web 首帧与原生首帧之间闪白。
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#0b0e14ff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  android: {
    backgroundColor: '#0b0e14',
  },
  ios: {
    backgroundColor: '#0b0e14',
  },
};

export default config;
