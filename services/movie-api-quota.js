export function getMovieApiQuotaStatus(current, limits, bonusRequests = 0) {
  const dailyRequests = Number(current?.dailyRequests) || 0;
  const weeklyRequests = Number(current?.weeklyRequests) || 0;
  const monthlyRequests = Number(current?.monthlyRequests) || 0;
  const bonus = Math.max(0, Number(bonusRequests) || 0);
  return {
    ...limits,
    allowed: dailyRequests < limits.dailyRequests && weeklyRequests < limits.weeklyRequests && monthlyRequests < limits.monthlyRequests + bonus,
    dailyRequests,
    weeklyRequests,
    monthlyRequests,
    dailyRequestsLimit: limits.dailyRequests,
    weeklyRequestsLimit: limits.weeklyRequests,
    monthlyRequestsLimit: limits.monthlyRequests + bonus,
    bonusRequests: bonus,
  };
}
