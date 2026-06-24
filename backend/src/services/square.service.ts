import { squareClient } from '../config/square';

export const createSubscription = async (params: {
  customerId: string;
  locationId: string;
  planVariationId: string;
}) => {
  const { result } = await squareClient.subscriptionsApi.createSubscription({
    idempotencyKey: `sub_${Date.now()}`,
    locationId: params.locationId,
    customerId: params.customerId,
    planVariationId: params.planVariationId,
  });
  return result.subscription;
};

export const createCustomer = async (params: {
  email: string;
  companyName: string;
  referenceId: string;
}) => {
  const { result } = await squareClient.customersApi.createCustomer({
    emailAddress: params.email,
    companyName: params.companyName,
    referenceId: params.referenceId,
    nickname: params.companyName,
  });

  return result.customer;
};

export const cancelExistingSubscription = async (subscriptionId: string) => {
  await squareClient.subscriptionsApi.cancelSubscription(subscriptionId);
};
