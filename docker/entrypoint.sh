#!/bin/sh
set -e
node ./prisma-cli/node_modules/prisma/build/index.js db push --schema=./prisma/schema.prisma --skip-generate
exec node server.js
