import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.klinebuty.chart',
  appName: 'Kline Buty',
  webDir: 'www',
  android: {
    // 图表全屏，背景色与深色主题一致；安全区处理后续接 @capacitor/status-bar
    backgroundColor: '#0b0e14',
  },
  ios: {
    backgroundColor: '#0b0e14',
  },
};

export default config;
