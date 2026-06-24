import Company, { CompanyDocument } from '../models/company.model';
import { AppError } from './errors';

export const PLATFORM_TENANT_ID = '__platform__';
export const PLATFORM_ORGANIZATION_NAME = 'Platform';
export const PLATFORM_ORGANIZATION_SLUG = 'platform';

const collapseWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

export const normalizeOrganizationName = (value: string) => collapseWhitespace(value).toLowerCase();

export const slugifyOrganization = (value: string) => {
  const slug = collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'workspace';
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const ensureUniqueOrganizationSlug = async (input: string, excludeCompanyId?: string) => {
  const baseSlug = slugifyOrganization(input);
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await Company.findOne({
      slug,
      ...(excludeCompanyId ? { _id: { $ne: excludeCompanyId } } : {}),
    }).select('_id');

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

export const syncCompanyIdentity = async <T extends CompanyDocument>(company: T): Promise<T> => {
  const normalizedName = normalizeOrganizationName(company.name);
  let changed = false;

  if (!company.slug) {
    company.slug = await ensureUniqueOrganizationSlug(company.name || company.tenantId, company.id);
    changed = true;
  }

  if (!company.normalizedName || company.normalizedName !== normalizedName) {
    company.normalizedName = normalizedName;
    changed = true;
  }

  if (changed) {
    await company.save();
  }

  return company;
};

export const resolveCompanyByIdentifier = async (identifier?: string | null) => {
  const value = identifier?.trim();
  if (!value) {
    return null;
  }

  const exactNamePattern = new RegExp(`^${escapeRegex(collapseWhitespace(value))}$`, 'i');
  const candidates = await Company.find({
    $or: [
      { slug: slugifyOrganization(value) },
      { tenantId: value },
      { normalizedName: normalizeOrganizationName(value) },
      { name: exactNamePattern },
    ],
  });

  if (candidates.length > 1) {
    throw new AppError(
      'Organization name is ambiguous. Use the organization slug instead.',
      409,
      'ORGANIZATION_AMBIGUOUS',
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  return syncCompanyIdentity(candidates[0]);
};

export const serializeCompany = (company: CompanyDocument) => ({
  id: company.id,
  tenantKey: company.tenantId,
  organizationSlug: company.slug,
  organizationName: company.name,
  contactEmail: company.contactEmail,
  plan: company.plan,
  isActive: company.isActive,
  squareCustomerId: company.squareCustomerId ?? null,
});

export const serializeUserWithOrganization = (params: {
  user: {
    id?: string;
    _id?: unknown;
    name: string;
    email: string;
    role: string;
    tenantId: string;
    isActive?: boolean;
  };
  company?: CompanyDocument | null;
}) => {
  const { user, company } = params;
  const organizationName = company?.name ?? PLATFORM_ORGANIZATION_NAME;
  const organizationSlug = company?.slug ?? PLATFORM_ORGANIZATION_SLUG;

  return {
    id: user.id ?? String(user._id ?? ''),
    name: user.name,
    email: user.email,
    role: user.role,
    tenantKey: user.tenantId,
    organizationName,
    organizationSlug,
    isActive: user.isActive,
  };
};
