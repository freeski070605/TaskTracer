import FinancialRecord, {
  FinancialRecordDocument,
  FinancialRecordType,
} from '../models/financialRecord.model';

export const createFinancialRecord = async (input: {
  tenantId: string;
  type: FinancialRecordType;
  amount?: number;
  currency?: string;
  status?: string;
  description: string;
  referenceId?: string | null;
  externalReferenceId?: string | null;
  createdBy?: string | null;
  occurredAt?: Date;
  metadata?: Record<string, unknown>;
}): Promise<FinancialRecordDocument> => {
  return FinancialRecord.create({
    tenantId: input.tenantId,
    type: input.type,
    amount: input.amount ?? 0,
    currency: input.currency ?? 'USD',
    status: input.status ?? 'recorded',
    description: input.description,
    referenceId: input.referenceId ?? null,
    externalReferenceId: input.externalReferenceId ?? null,
    createdBy: input.createdBy ?? null,
    occurredAt: input.occurredAt ?? new Date(),
    metadata: input.metadata ?? {},
  });
};
