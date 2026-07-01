const path = require('path');

module.exports = {
  apps: [
    {
      name: 'myacs',
      script: 'server.js',
      cwd: path.resolve(__dirname),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
