export type Role = 'associate' | 'supervisor' | 'admin' | 'superadmin';

export interface OrganizationIdentity {
  tenantKey: string;
  organizationName: string;
  organizationSlug: string;
}
