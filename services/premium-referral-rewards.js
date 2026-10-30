export const PREMIUM_REFERRAL_CASH_REWARDS_NGN = [350, 150, 50];
export const PREMIUM_REFERRAL_RENEWAL_COINS = 5;
export const PREMIUM_REFERRAL_MAX_GENERATIONS = 3;

export function isFirstPremiumPayment({ hasFirstPaymentMarker = false, verifiedVia = null, hasPriorSuccessfulPayment = false, forceRenewal = false } = {}) {
  return !forceRenewal && !hasFirstPaymentMarker && verifiedVia !== "payment" && !hasPriorSuccessfulPayment;
}

export function planPremiumReferralAwards(ancestors, firstPayment) {
  return (Array.isArray(ancestors) ? ancestors : [])
    .slice(0, PREMIUM_REFERRAL_MAX_GENERATIONS)
    .map((ancestor, index) => {
      const generation = index + 1;
      const eligible = !!ancestor?.eligible;
      if (!eligible) {
        return { uid: ancestor?.uid || "", generation, eligible: false, rewardType: "none", amountNgn: 0, coins: 0, reason: "referrer_not_active_premium" };
      }
      if (firstPayment) {
        return { uid: ancestor.uid, generation, eligible: true, rewardType: "cash", amountNgn: PREMIUM_REFERRAL_CASH_REWARDS_NGN[index], coins: 0, reason: "first_successful_premium_payment" };
      }
      if (generation === 1) {
        return { uid: ancestor.uid, generation, eligible: true, rewardType: "coins", amountNgn: 0, coins: PREMIUM_REFERRAL_RENEWAL_COINS, reason: "premium_renewal_or_rollover" };
      }
      return { uid: ancestor.uid, generation, eligible: true, rewardType: "none", amountNgn: 0, coins: 0, reason: "renewal_rewards_only_direct_referrer" };
    });
}
