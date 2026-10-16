/**
 * Migrate / backfill users for Nest pnk-id API.
 *
 * Usage:
 *   npx tsx scripts/migrate-users.ts --dry-run
 *   npx tsx scripts/migrate-users.ts
 *
 * Env:
 *   DATABASE_URL          — target DB (required)
 *   SOURCE_DATABASE_URL   — optional source (defaults to DATABASE_URL)
 */
import { PrismaClient } from '@prisma/client';
import {
  planUserMigration,
  type MigrateReport,
  type SourceUser,
} from '../src/migration/migrate-users.logic';

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const dryRun = hasFlag('--dry-run');
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl) {
    throw new Error('DATABASE_URL is required');
  }
  const sourceUrl = process.env.SOURCE_DATABASE_URL || targetUrl;
  const sameDb = sourceUrl === targetUrl;

  const source = new PrismaClient({
    datasources: { db: { url: sourceUrl } },
  });
  const target = sameDb
    ? source
    : new PrismaClient({
        datasources: { db: { url: targetUrl } },
      });

  const report: MigrateReport = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    dryRun,
  };

  try {
    const rows = await source.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    report.total = rows.length;

    for (const row of rows) {
      try {
        const sourceUser: SourceUser = {
          id: row.id,
          login: row.login,
          email: row.email,
          phone: row.phone,
          passwordHash: row.passwordHash,
          passwordAlgo: row.passwordAlgo,
          status: row.status,
          blockedAt: row.blockedAt,
          deletedAt: row.deletedAt,
          displayName: row.displayName,
          firstName: row.firstName,
          lastName: row.lastName,
          gender: row.gender,
          birthDate: row.birthDate,
          timezone: row.timezone,
          avatarUrl: row.avatarUrl,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          telegramId: row.telegramId,
          telegramUsername: row.telegramUsername,
          registrationIp: row.registrationIp,
          sandboxUntil: row.sandboxUntil,
          lastLoginAt: row.lastLoginAt,
        };

        const existing = await target.user.findUnique({
          where: { id: row.id },
          select: {
            id: true,
            login: true,
            passwordAlgo: true,
            status: true,
            blockedAt: true,
          },
        });

        const plan = planUserMigration(sourceUser, existing);

        if (plan.action === 'skip') {
          report.skipped += 1;
          continue;
        }

        if (dryRun) {
          console.log(`[dry-run] ${plan.action} ${row.login} (${row.id})`);
          if (plan.action === 'create') report.created += 1;
          else report.updated += 1;
          continue;
        }

        if (plan.action === 'create') {
          await target.user.create({ data: plan.data });
          report.created += 1;
          console.log(`created ${row.login}`);
        } else {
          await target.user.update({
            where: { id: plan.id },
            data: plan.data,
          });
          report.updated += 1;
          console.log(`updated ${row.login}`);
        }
      } catch (err) {
        report.errors += 1;
        console.error(`error ${row.login}:`, err);
      }
    }
  } finally {
    await source.$disconnect();
    if (!sameDb) {
      await target.$disconnect();
    }
  }

  console.log('\nMigration report');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
