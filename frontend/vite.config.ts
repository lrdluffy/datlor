import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  server: {
    port: 5173,
    proxy: {
      // identity-service (auth: register/login/refresh/logout)
      '/api/auth': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // identity-service (US-15/US-17: profile edit + privacy toggle)
      '/api/profiles': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // core-service (channels REST reads: list/detail/members/history/delete)
      '/api/channels': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // core-service (groups REST: create/list/detail/invite/accept/reject/direct-add)
      '/api/groups': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // core-service STOMP/SockJS endpoint - ws:true proxies the upgrade too
      '/ws': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        ws: true,
      },
      // media-service (US-18: upload, metadata, content download)
      '/api/media': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
});
