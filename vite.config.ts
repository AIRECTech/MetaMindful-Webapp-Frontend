import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appId = env.VITE_APPLE_TEAM_APP_ID || 'BB45CSH5W3.com.AIREC.MetaMindful';

  return {
    plugins: [
      react(),
      {
        name: 'generate-aasa',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/.well-known/apple-app-site-association') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                applinks: {
                  apps: [],
                  details: [
                    {
                      appID: appId,
                      paths: ["*"]
                    }
                  ]
                }
              }, null, 2));
            } else {
              next();
            }
          });
        },
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: '.well-known/apple-app-site-association',
            source: JSON.stringify({
              applinks: {
                apps: [],
                details: [
                  {
                    appID: appId,
                    paths: ["*"]
                  }
                ]
              }
            }, null, 2)
          });
        }
      }
    ]
  };
})
