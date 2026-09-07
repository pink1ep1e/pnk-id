#!/bin/sh
set -e
npx prisma db push --skip-generate
npx tsx prisma/seed.ts || true
exec node server.js
