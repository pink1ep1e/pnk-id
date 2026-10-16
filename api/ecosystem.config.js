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
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
      },
    },
  ],
};
