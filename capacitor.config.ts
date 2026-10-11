import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studybuddy.ai',
  appName: 'Study Buddy AI',
  webDir: 'www',
  server: {
    url: 'https://ai-chat-bot-gold-mu.vercel.app',
    cleartext: false,
  },
};

export default config;