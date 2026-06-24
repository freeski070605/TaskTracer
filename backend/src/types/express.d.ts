import { CompanyDocument } from '../models/company.model';
import { UserDocument } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      company?: CompanyDocument;
      tenantId?: string;
      rawBody?: Buffer;
      requestId?: string;
    }
  }
}

export {};

