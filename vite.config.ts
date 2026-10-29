import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // 允许局域网访问，方便手机真机调试
    port: 3000,
  },
});