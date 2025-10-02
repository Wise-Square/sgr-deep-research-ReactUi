import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 60000, // 60 секунд таймаут
        secure: false,
        ws: false, // Отключаем WebSocket прокси
        followRedirects: true,
        // Настройки для множественных соединений
        agent: false, // Отключаем переиспользование соединений
        // Настройки для стриминга
        configure: (proxy: any) => {
          proxy.on('proxyReq', (proxyReq: any, req: any) => {
            // Добавляем заголовки для стриминга
            if (req.url?.includes('/chat/completions')) {
              proxyReq.setHeader('Accept', 'text/event-stream');
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('Connection', 'keep-alive');
            }
          });
          
          proxy.on('proxyRes', (proxyRes: any, req: any) => {
            // Отключаем буферизацию для стриминга
            if (req.url?.includes('/chat/completions')) {
              // Устанавливаем заголовки для стриминга
              proxyRes.headers['cache-control'] = 'no-cache';
              proxyRes.headers['connection'] = 'keep-alive';
              proxyRes.headers['x-accel-buffering'] = 'no';
              proxyRes.headers['content-type'] = 'text/event-stream';
              
              // CORS заголовки
              proxyRes.headers['access-control-allow-origin'] = '*';
              proxyRes.headers['access-control-allow-methods'] = 'GET, POST, OPTIONS, PUT, DELETE';
              proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, Accept, Cache-Control';
              proxyRes.headers['access-control-expose-headers'] = 'Content-Type, Cache-Control';
            }
          });
          
        }
      }
    }
  }
})
