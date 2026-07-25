import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // identity-service (auth: register/login/refresh/logout)
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // core-service (channels REST reads: list/detail/members/history/delete)
      '/api/channels': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // core-service STOMP/SockJS endpoint - ws:true proxies the upgrade too
      '/ws': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
