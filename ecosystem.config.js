// PM2: pm2 start ecosystem.config.js
// Перед первым запуском: npm ci && npm run build
module.exports = {
  apps: [
    {
      name: "furshet-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: "furshet-bot",
      script: "node_modules/.bin/tsx",
      args: "src/bot/index.ts",
      cwd: __dirname,
      env: { NODE_ENV: "production" },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
