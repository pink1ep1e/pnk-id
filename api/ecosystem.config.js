/** PM2 — run from `api/` after `npm run build`. */
module.exports = {
  apps: [
    {
      name: 'pnk-id-api',
      cwd: __dirname,
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      // Rate limits live in Postgres — cluster mode is safe if you raise instances.
      // instances: 'max',
      // exec_mode: 'cluster',
      max_memory_restart: '512M',
      // PORT и остальное — из api/.env (ConfigModule). Не задавай PORT здесь:
      // иначе он перебьёт .env и врежется в Next на 3100.
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
