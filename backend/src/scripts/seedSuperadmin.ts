import mongoose from 'mongoose';
import { env } from '../config/env';
import { connectDB } from '../config/db';
import { logger } from '../config/logger';
import User from '../models/user.model';
import { hashPassword } from '../services/password.service';
import { PLATFORM_TENANT_ID } from '../utils/organization';

type CliArgs = {
  email?: string;
  password?: string;
  name?: string;
};

const usage = `
Usage:
  npm run seed:superadmin -- --email you@example.com --password StrongPass123! --name "Platform Admin"

Notes:
  - The email must also appear in SUPERADMIN_EMAILS in backend/.env
  - Running the script again updates the existing platform superadmin password/name
`.trim();

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--email' && next) {
      args.email = next;
      index += 1;
    } else if (token === '--password' && next) {
      args.password = next;
      index += 1;
    } else if (token === '--name' && next) {
      args.name = next;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      console.log(usage);
      process.exit(0);
    }
  }

  return args;
};

const main = async () => {
  const { email, password, name } = parseArgs(process.argv.slice(2));
  const normalizedEmail = email?.trim().toLowerCase();
  const resolvedName = name?.trim() || 'Platform Admin';

  if (!normalizedEmail || !password) {
    throw new Error(`Missing required arguments.\n\n${usage}`);
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const allowlist = new Set(
    (env.SUPERADMIN_EMAILS ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!allowlist.has(normalizedEmail)) {
    throw new Error(
      `The email "${normalizedEmail}" is not in SUPERADMIN_EMAILS. Add it to backend/.env before seeding.`,
    );
  }

  await connectDB();

  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ tenantId: PLATFORM_TENANT_ID, email: normalizedEmail });

  if (existing) {
    existing.name = resolvedName;
    existing.passwordHash = passwordHash;
    existing.role = 'superadmin';
    existing.isActive = true;
    existing.refreshTokenHash = null;
    await existing.save();

    logger.info(`Updated superadmin account for ${normalizedEmail}`);
  } else {
    await User.create({
      tenantId: PLATFORM_TENANT_ID,
      name: resolvedName,
      email: normalizedEmail,
      passwordHash,
      role: 'superadmin',
      isActive: true,
      refreshTokenHash: null,
    });

    logger.info(`Created superadmin account for ${normalizedEmail}`);
  }
};

main()
  .catch((error) => {
    logger.error('Superadmin seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
