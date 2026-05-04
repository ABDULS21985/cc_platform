// PM2 ecosystem for cc_platform (backend Flask + frontend Next.js)
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 logs / pm2 status / pm2 stop all / pm2 delete all

const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'ccp-backend',
      cwd: path.join(root, 'backend'),
      script: 'app.py',
      interpreter: path.join(root, 'backend', '.venv', 'bin', 'python'),
      env: {
        PORT: '8080',
        PYTHONUNBUFFERED: '1',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      kill_timeout: 5000,
      out_file: path.join(root, 'logs', 'backend-out.log'),
      error_file: path.join(root, 'logs', 'backend-err.log'),
      merge_logs: true,
    },
    {
      name: 'ccp-frontend',
      cwd: path.join(root, 'frontend'),
      script: path.join(root, 'frontend', 'node_modules', 'next', 'dist', 'bin', 'next'),
      args: 'dev --turbopack -p 3000',
      interpreter: 'node',
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      kill_timeout: 5000,
      out_file: path.join(root, 'logs', 'frontend-out.log'),
      error_file: path.join(root, 'logs', 'frontend-err.log'),
      merge_logs: true,
    },
  ],
};
