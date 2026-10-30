export const FREE_DAILY_COIN_CLAIM_AMOUNT = 1;
export const PREMIUM_DAILY_COIN_CLAIM_AMOUNT = 3;
export const ADMIN_DAILY_COIN_CLAIM_AMOUNT = 5;

export const FREE_CHANNEL_REACTION_COST = 8;
export const FREE_CHANNEL_POLL_VOTE_COST = 10;
export const PREMIUM_CHANNEL_ACTION_COST = 5;

export function dailyCoinClaimAmount({ isAdmin = false, isPremium = false } = {}) {
  if (isAdmin) return ADMIN_DAILY_COIN_CLAIM_AMOUNT;
  return isPremium ? PREMIUM_DAILY_COIN_CLAIM_AMOUNT : FREE_DAILY_COIN_CLAIM_AMOUNT;
}

export function channelCoinCost(action, isPremium = false) {
  if (isPremium) return PREMIUM_CHANNEL_ACTION_COST;
  return action === "poll" ? FREE_CHANNEL_POLL_VOTE_COST : FREE_CHANNEL_REACTION_COST;
}

export function nextVerificationExpiry(currentExpiry, now, durationDays, isActive) {
  const current = Number(currentExpiry) || 0;
  const base = isActive ? Math.max(Number(now) || Date.now(), current) : (Number(now) || Date.now());
  return base + Math.max(0, Number(durationDays) || 0) * 24 * 60 * 60 * 1000;
}
