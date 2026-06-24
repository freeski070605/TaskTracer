import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { env } from '../config/env';
import Company, { CompanyDocument } from '../models/company.model';
import User from '../models/user.model';
import { audit } from '../services/audit.service';
import { hashPassword, verifyPassword } from '../services/password.service';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../services/token.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import {
  PLATFORM_TENANT_ID,
  ensureUniqueOrganizationSlug,
  normalizeOrganizationName,
  resolveCompanyByIdentifier,
  serializeUserWithOrganization,
  syncCompanyIdentity,
} from '../utils/organization';

const allowedSuperadminEmails = new Set(
  (env.SUPERADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const canBootstrapSuperadmin = (email: string) => allowedSuperadminEmails.has(email.trim().toLowerCase());

const getOrganizationIdentifier = (body: {
  organization?: string;
  organizationName?: string;
  organizationSlug?: string;
  tenantId?: string;
}) => body.organization ?? body.organizationSlug ?? body.organizationName ?? body.tenantId;

export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    tenantId,
    organizationName,
    organizationSlug,
    name,
    email,
    password,
    role,
  } = req.body as {
    tenantId?: string;
    organizationName?: string;
    organizationSlug?: string;
    name: string;
    email: string;
    password: string;
    role?: string;
  };

  if (role === 'superadmin') {
    if (!canBootstrapSuperadmin(email)) {
      throw new AppError(
        'This email is not allowed to create a superadmin account',
        403,
        'SUPERADMIN_REGISTRATION_FORBIDDEN',
      );
    }

    const existingSuperadmin = await User.findOne({ tenantId: PLATFORM_TENANT_ID, email });
    if (existingSuperadmin) {
      throw new AppError('User already exists', 409, 'USER_EXISTS');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      tenantId: PLATFORM_TENANT_ID,
      name,
      email,
      passwordHash,
      role: 'superadmin',
    });

    res.status(201).json({
      user: serializeUserWithOrganization({ user }),
    });
    return;
  }

  const organizationIdentifier = getOrganizationIdentifier({ organizationName, organizationSlug, tenantId });
  if (!organizationIdentifier) {
    throw new AppError('Organization is required', 400, 'ORGANIZATION_REQUIRED');
  }

  let company = await resolveCompanyByIdentifier(organizationIdentifier);
  if (!company) {
    const resolvedName = organizationName ?? organizationIdentifier;
    const uniqueSlug = await ensureUniqueOrganizationSlug(organizationSlug ?? resolvedName);
    company = await Company.create({
      tenantId: tenantId ?? uniqueSlug,
      slug: uniqueSlug,
      name: resolvedName,
      normalizedName: normalizeOrganizationName(resolvedName),
      contactEmail: email,
      plan: 'starter',
    });
  } else {
    company = await syncCompanyIdentity(company);
  }

  if (!company.isActive) {
    throw new AppError('Workspace is inactive', 403, 'WORKSPACE_INACTIVE');
  }

  const existing = await User.findOne({ tenantId: company.tenantId, email });
  if (existing) {
    throw new AppError('User already exists', 409, 'USER_EXISTS');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    tenantId: company.tenantId,
    name,
    email,
    passwordHash,
    role: role ?? 'associate',
  });

  await audit(company.tenantId, 'user.registered', user.id, { email });

  res.status(201).json({
    user: serializeUserWithOrganization({ user, company }),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const {
    tenantId,
    organization,
    organizationName,
    organizationSlug,
    email,
    password,
  } = req.body as {
    tenantId?: string;
    organization?: string;
    organizationName?: string;
    organizationSlug?: string;
    email: string;
    password: string;
  };

  const organizationIdentifier = getOrganizationIdentifier({
    organization,
    organizationName,
    organizationSlug,
    tenantId,
  });

  let company = await resolveCompanyByIdentifier(organizationIdentifier);
  let user = company ? await User.findOne({ tenantId: company.tenantId, email }) : null;

  if (!user) {
    const matches = await User.find({ email, isActive: true }).limit(2);
    if (matches.length === 1) {
      user = matches[0];
      if (user.tenantId !== PLATFORM_TENANT_ID) {
        const workspace = await Company.findOne({ tenantId: user.tenantId });
        if (!workspace) {
          throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
        }
        company = await syncCompanyIdentity(workspace);
      } else if (organizationIdentifier) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }
    } else if (matches.length > 1 && !organizationIdentifier) {
      throw new AppError('Organization is required for this account', 400, 'ORGANIZATION_REQUIRED');
    }
  }

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('User is inactive', 403, 'USER_INACTIVE');
  }
  if (company && !company.isActive) {
    throw new AppError('Workspace is inactive', 403, 'WORKSPACE_INACTIVE');
  }

  const payload = { sub: user.id, tenantId: user.tenantId, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  if (user.tenantId !== PLATFORM_TENANT_ID) {
    await audit(user.tenantId, 'user.login', user.id, {});
  }

  res.json({
    accessToken,
    refreshToken,
    user: serializeUserWithOrganization({ user, company }),
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub);
  if (!user || !user.refreshTokenHash) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH');
  }
  if (!user.isActive) {
    throw new AppError('User is inactive', 403, 'USER_INACTIVE');
  }

  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!valid) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH');
  }

  let company: CompanyDocument | null = null;
  if (user.tenantId !== PLATFORM_TENANT_ID) {
    const workspace = await Company.findOne({ tenantId: user.tenantId });
    if (!workspace) {
      throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
    }
    company = await syncCompanyIdentity(workspace);
    if (!company.isActive) {
      throw new AppError('Workspace is inactive', 403, 'WORKSPACE_INACTIVE');
    }
  }

  const newPayload = { sub: user.id, tenantId: user.tenantId, role: user.role };
  const accessToken = signAccessToken(newPayload);
  const newRefresh = signRefreshToken(newPayload);
  user.refreshTokenHash = await bcrypt.hash(newRefresh, 10);
  await user.save();

  res.json({
    accessToken,
    refreshToken: newRefresh,
    user: serializeUserWithOrganization({ user, company: company ?? undefined }),
  });
});
