import { Request, Response } from 'express';
import Company from '../models/company.model';
import User from '../models/user.model';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { hashPassword, verifyPassword } from '../services/password.service';
import {
  normalizeOrganizationName,
  serializeCompany,
  serializeUserWithOrganization,
  syncCompanyIdentity,
} from '../utils/organization';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const company = req.company ? await syncCompanyIdentity(req.company) : null;

  res.json({
    profile: serializeUserWithOrganization({ user, company }),
    workspace: company ? serializeCompany(company) : null,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string | undefined;
  const user = req.user!;
  const { name, email } = req.body as { name?: string; email?: string };

  if (email && email !== user.email) {
    const existing = tenantId
      ? await User.findOne({ tenantId, email, _id: { $ne: user.id } })
      : await User.findOne({ tenantId: user.tenantId, email, _id: { $ne: user.id } });

    if (existing) {
      throw new AppError('Email already in use', 409, 'EMAIL_IN_USE');
    }
    user.email = email;
  }

  if (name) {
    user.name = name;
  }

  await user.save();

  res.json({
    user: serializeUserWithOrganization({ user, company: req.company }),
  });
});

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const company = req.company ?? (await Company.findOne({ tenantId: req.tenantId }));

  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }

  const {
    organizationName,
    contactEmail,
  } = req.body as {
    organizationName?: string;
    contactEmail?: string;
  };

  if (organizationName) {
    company.name = organizationName;
    company.normalizedName = normalizeOrganizationName(organizationName);
  }

  if (contactEmail) {
    company.contactEmail = contactEmail;
  }

  await company.save();
  await syncCompanyIdentity(company);

  res.json({
    workspace: serializeCompany(company),
  });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD');
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  res.json({ success: true });
});
