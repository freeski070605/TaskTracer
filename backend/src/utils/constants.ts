export const ROLES = ['associate', 'supervisor', 'admin', 'superadmin'] as const;
export type Role = (typeof ROLES)[number];
