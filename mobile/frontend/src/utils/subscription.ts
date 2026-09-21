import type { Subscription } from '../types/hyperlocal';

// `/businesses/mine` returns each business with its current subscription and the plan
// populated, so the plan is normally an object; it can still be a bare id.
export const subscriptionPlanId = (subscription?: Subscription | null): string | undefined =>
  typeof subscription?.plan === 'object' ? subscription.plan._id : subscription?.plan;

export const subscriptionPlanName = (subscription?: Subscription | null): string | undefined =>
  typeof subscription?.plan === 'object' ? subscription.plan.name : undefined;

export const isSubscriptionActive = (subscription?: Subscription | null): subscription is Subscription =>
  Boolean(subscription && subscription.status === 'active' && new Date(subscription.endsAt) >= new Date());

export const subscriptionDaysLeft = (subscription: Subscription): number =>
  Math.max(0, Math.ceil((new Date(subscription.endsAt).getTime() - Date.now()) / 86_400_000));

export const formatPlanDate = (iso: string, locale = 'en-IN'): string =>
  new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

// -1 is how the backend says "unlimited".
export const formatQuota = (used: number, limit: number): string => (limit === -1 ? `${used} used · Unlimited` : `${used} of ${limit} used`);
