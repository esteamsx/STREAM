import test from "node:test";
import assert from "node:assert/strict";
import { getMovieApiQuotaStatus } from "../services/movie-api-quota.js";

const limits = { dailyRequests: 10, weeklyRequests: 50, monthlyRequests: 100 };

test("reports actual usage separately from configured limits", () => {
  const status = getMovieApiQuotaStatus({ dailyRequests: 3, weeklyRequests: 12, monthlyRequests: 42 }, limits);
  assert.equal(status.allowed, true);
  assert.equal(status.dailyRequests, 3);
  assert.equal(status.weeklyRequests, 12);
  assert.equal(status.monthlyRequests, 42);
  assert.equal(status.dailyRequestsLimit, 10);
  assert.equal(status.weeklyRequestsLimit, 50);
  assert.equal(status.monthlyRequestsLimit, 100);
});

test("adds Movie API bonus requests to the monthly cap only", () => {
  const status = getMovieApiQuotaStatus({ dailyRequests: 9, weeklyRequests: 49, monthlyRequests: 100 }, limits, 25);
  assert.equal(status.allowed, true);
  assert.equal(status.dailyRequestsLimit, 10);
  assert.equal(status.weeklyRequestsLimit, 50);
  assert.equal(status.monthlyRequestsLimit, 125);
  assert.equal(status.bonusRequests, 25);
});

test("bonus requests cannot bypass daily or weekly caps", () => {
  const dailyBlocked = getMovieApiQuotaStatus({ dailyRequests: 10, weeklyRequests: 20, monthlyRequests: 20 }, limits, 1000);
  const weeklyBlocked = getMovieApiQuotaStatus({ dailyRequests: 1, weeklyRequests: 50, monthlyRequests: 20 }, limits, 1000);
  assert.equal(dailyBlocked.allowed, false);
  assert.equal(weeklyBlocked.allowed, false);
  assert.equal(dailyBlocked.dailyRequests, 10);
  assert.equal(weeklyBlocked.weeklyRequests, 50);
});

test("blocks once the base plus monthly bonus allowance is consumed", () => {
  const status = getMovieApiQuotaStatus({ dailyRequests: 2, weeklyRequests: 20, monthlyRequests: 105 }, limits, 5);
  assert.equal(status.allowed, false);
  assert.equal(status.monthlyRequests, 105);
  assert.equal(status.monthlyRequestsLimit, 105);
});
