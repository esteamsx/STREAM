# ES Teams Firestore Read-Usage Audit and Optimization Report

**Audit date:** 29 October 2026
**Repository:** `esteamsx/STREAM`
**Scope:** repository-wide static review plus focused mock-Firestore read-count tests. No production Firestore credentials, emulator data, billing export, or Query Explain session was available.

## Executive summary

The six collection figures supplied for the recent usage window sum to **59,197 reads**. If those figures cover the same project and day, that is **9,197 (18.4%) above** Firestore's commonly applicable 50,000-read daily free quota; the figures also omit other collections, so they are not a complete project total. This is a conditional comparison, not a claim about the exact billing period or database configuration.

The audit found high-multiplier reads in the following feed, chat polling, repeated API telemetry transactions, notification fallbacks, user/follow graph operations, status management, admin screens, and several scheduled/background paths. This change set targets three clear repeat-read paths first: the following feed, community chat polling, and API analytics' own per-request reads. It also coalesces concurrent cold profile/follow-list loads and declares the composite indexes required by the relevant query patterns.

**This does not establish that the site now remains under free quota.** The tests measure code paths against deterministic mocks, not production traffic, Firestore billing, or index-entry scans. Production measurements and index deployment are still required.

## Supplied usage snapshot

| Collection | Reads reported | Share of these six |
|---|---:|---:|
| `/follows` | 38,945 | 65.8% |
| `/users` | 12,175 | 20.6% |
| `/posts` | 4,622 | 7.8% |
| `/notifications` | 1,332 | 2.3% |
| `/channelReactLog` | 1,135 | 1.9% |
| `/settings` | 988 | 1.7% |
| **Total** | **59,197** | **100%** |

Percentages are calculated only over the six supplied figures. In the code, `/settings` reads are principally the `site` and `pageLocks` documents in `services/auth.js`, plus `fakeCoinScan` state in `services/fake-coins.js`; those configuration paths were not changed because their freshness/authorization behavior needs production-specific validation.

## Changes made and measured results

| Area | Change | Test measurement | Expected effect and limit |
|---|---|---|---|
| Following feed (`/posts`, `/follows`) | Newest-first, visibility-filtered post queries use 20-document pages per at-most-30-followee chunk, fetching more only when hidden posts leave the result short. Each chunk retains the former 50-post scan ceiling. The query projects fields required by the existing feed response. A bounded legacy query path preserves operation while the composite index is unavailable. | In a deterministic 500-followee fixture with two visible posts per followee, **340 post documents** were returned/read by the optimized mock path versus the old query bound of **840** (16 full UID chunks × 50 plus 40 in the final chunk): **500 fewer, 59.5%**. The 20-post result, newest ordering, privacy filters, hidden-post continuation, and 50-document cap are tested. | This is a test fixture, not production telemetry. It covers post documents only; follow-edge, author, relationship, reshare, and stats reads are not included. If many posts are hidden, the helper may approach the old 50-per-chunk ceiling. The new ordered query is most efficient after its index has finished building. |
| Community chat | Initial load remains the latest 50 messages. Polls now use an `(createdAt, document ID)` cursor and return only later messages, drain bursts in bounded pages, back off from 4 seconds to 15 seconds when idle, stop while the tab is hidden, and perform a 50-message reconciliation every 60 seconds to reflect remote deletions. A delete action requests immediate reconciliation. | Mock tests verify a 50-message initial cap, same-millisecond cursor tie-breaking, and that an idle delta returns no old message documents. | Previous behavior could return 50 full message documents every 4 seconds: up to **750 returned documents/minute** per open chat when at least 50 messages exist. Under steady idle assumptions, the new cadence is roughly 50 reconciliation documents plus about 4–5 empty-query minimum reads/minute (approximately 55 versus 750, about 93% fewer). This is a code-derived estimate, not measured production billing; active chats return the new messages, and Firestore bills at least one read for an empty query. |
| API request telemetry (`apiRequestEvents`, `apiAnalyticsDaily`) | Replaced a per-response transaction that read the event, daily aggregate, and tracking metadata with one atomic batch: `create` for the event/error record and server-side increments for daily and endpoint counters. Event creation plus the aggregate update are atomic, so a duplicate event ID cannot increment counters twice. Tracking metadata is initialized with an idempotent create rather than read on every request. | The fake Firestore counted **0 document reads** for telemetry writes; repeated endpoint tests confirm daily and endpoint request/success/failure counts accumulate correctly. | The old source performed three transaction document reads per tracked request before transaction retries; the new event path performs zero document reads. At 10,000 tracked API responses/day, this removes up to 30,000 telemetry reads by source-derived arithmetic. Actual request volume and production billing are unknown. |
| User profile / follow caches | Concurrent cold `getUserProfile` reads and concurrent follower/following list loads are coalesced. Pending profile/list results are prevented from repopulating caches after the existing invalidation helpers run; privacy-setting writes now invalidate the profile cache. Existing cache TTLs are unchanged. | Syntax and full-suite tests pass; there is no production concurrency trace to quantify duplicate suppression. | Savings depend on concurrent cold requests and instance distribution. This does not make the process-local cache shared between server instances or extend its TTL. Other bulk profile reads and direct mutation paths remain to audit. |
| Following-feed badge | Profile-page badge polling now matches the server's two-minute cache cadence (20 seconds → 120 seconds) and coalesces overlapping requests. | Rendered client script compiles. | Sixfold fewer badge HTTP requests from this timer while continuously open. Firestore-read savings are uncertain because the server already caches the count for two minutes and the cache is process-local. |
| Composite indexes | Added `posts(uid ASC, createdAt DESC)`, `posts(uid ASC, pinnedAt ASC)`, `notifications(uid ASC, read ASC)`, and `notifications(uid ASC, read ASC, type ASC)` to `firestore.indexes.json`. | JSON validation passes; index declarations are covered by syntax/config validation. | These target newest-first profile/following queries, pinned posts, and unread notification aggregations. Index-entry savings have **not** been measured. A declaration in the repository does not mean the production index is deployed or finished building. |

## Repository-wide expensive-read findings

The audit examined application routes, services, page clients, polling/listener schedules, and background/admin flows. These are the principal remaining sources and risks; not every one was changed in this focused pass.

1. **Follow graph and post fanout — `services/auth.js`, `views/profile.js`, `views/live-tv.js`.** The following feed loads up to 500 follow edges and previously queried up to 50 posts per 30-followee chunk before filtering privacy and returning 20. Discover is bounded per request but can read post batches, author documents, and relationship checks. The unseen-post badge also queries posts across followee chunks. The feed's post fanout was optimized here; follow-graph cardinality, discover, and badge query semantics still require production measurement.

2. **Global notifications and scheduled/user matching — `services/auth.js`, `routes/status.js`, `services/trading-credentials.js`.** Broadcast notification fanout reads all user IDs before chunking writes. Chunked writes do not reduce the preceding full user read. Status owner listing/deletion has unbounded child-view/comment reads in some paths. Renewal, pending-deletion, and opted-in trader selection have broad result sets. Cursor/batch processing can limit memory and work per invocation, but may not reduce total document reads where every eligible account must be processed; restart-safe completeness must be preserved.

3. **Notification list/count/mark-all — `services/auth.js`, `server.js`, `firestore.indexes.json`, `public/site-ui.js`, `views/account.js`, `views/live-tv.js`.** Normal lists are bounded, but an error fallback can read up to 500 unordered full documents and sort in memory. Unread count/fallback queries are capped at 100 and may undercount; mark-all handles at most 500 and can swallow commit errors. Pollers can issue more HTTP calls than the three-minute process cache can refresh. The unread-count composites are declared here, but the fallback, exact-count contract, pagination, and mark-all completion semantics remain to review.

4. **User documents and graph operations — `services/auth.js`, `server.js`.** Cold profile reads were not single-flight before this change. Follow/mutual/cleanup/follow-all paths include high-degree or unbounded reads; lists can cap at 500 without cursor continuation. Admin user listing/search can scan bounded pages then filter and underfill. Bulk profile loading and direct profile mutations still need path-by-path cache invalidation review.

5. **Channel reactions and admin pages — `services/auth.js`, `views/channel-react.js`.** Channel reaction history is normally small but has an error fallback that reads all matching history for a user, then sorts. The page polls every 30 seconds while a server cache lasts one minute. Admin user list/search and banned-user caps can truncate or underfill results. Remove broad fallbacks only with defined failure/cursor semantics and confirmed indexes.

6. **Community chat, comments, and status — `views/tools/trading.js`, `services/auth.js`, `routes/status.js`, `server.js`.** Community chat's repeated full 50-document poll was changed in this pass. Comments can read up to 500 full documents and filter hidden items after reading, without cursor pagination. Status details/deletion can perform unbounded view/comment reads. These need stable pagination and visibility/moderation regression fixtures.

7. **Search, profile posts, reshares, likes — `services/auth.js`, `server.js`.** Username search runs two bounded queries and relationship checks. Profile posts normally read a page plus pinned posts, but a missing-index fallback can read up to 200 unordered docs and disables pagination. Reshare statistics load original posts; likes reread a post to prepare the response. Projections or removing reads require response/privacy/concurrency checks.

8. **API analytics dashboard coin history — `services/api-analytics.js`, `server.js`, `views/admin.js`.** Per-request tracking reads were removed in this pass. Admin dashboard loads still scan matching coin-ledger documents in 250-row pages for spend, refunds, and income on each uncached dashboard request; this work grows with ledger history. Consider safe short-lived admin-summary caching or verified daily rollups only after reconciliation against the ledger, refunds, and earnings.

9. **Blacklist, analytics store, ads — `services/device-bans.js`, `middleware/analytics-tracker.js`, `services/ads.js`.** The device blacklist uses broad list/snapshot reads and hourly refreshes; its freshness is security-critical. Analytics uses fixed-document reads/writes and process-local aggregation that may overwrite across instances. Active/user ad reads can be broad, while ad-daily result caps can omit history. These need usage traces and multi-instance/retention tests before changing behavior.

10. **Other high-multiplier loops.** Status views/comments, broadcast recipients, relationship cleanup, mutual/follow-all operations, and account renewal/deletion jobs should be tested with populations beyond one batch. Pagination must resume safely and preserve all eligible recipients, counters, and complete deletion; simply lowering a limit would silently lose work.

## Test and validation results

- Complete Node test suite: **213 passed, 0 failed**.
- Focused API telemetry, following-feed, and community-chat query tests: **15 passed**.
- Modified JavaScript files passed `node --check`.
- Rendered profile and trading inline scripts compiled successfully (3 each).
- `firestore.indexes.json` parsed successfully (8 composite index declarations total).
- `git diff --check` passed.
- No Firestore security rules, coin deduction logic, Face ID, ALTCHA, or authentication authorization rules were changed.

## Production verification still required

1. Deploy/build the composite indexes and verify their **READY** state. The repository has no Firebase project binding/config that safely identifies a production deployment target, so this change does not deploy indexes.
2. Run representative traffic with Firestore Query Explain/usage telemetry for follows, posts, and notifications. Record document reads, index entries scanned, query pages, empty-query minimum reads, response bytes, and p50/p95 latency before and after.
3. Compare one-hour/day collection usage for the same active-user volume, including multiple application instances. Separate app reads from Firebase Console/admin activity and scheduled jobs.
4. Exercise privacy combinations (`everyone`, `friends`, `only_me`), equal timestamps, more than 500 followees, >50 hidden posts, high-degree profiles, chat bursts, deletions, reconnect/hidden tabs, and missing-index fallback behavior.
5. Reconcile API daily counters and endpoint counts against `apiRequestEvents`, including failed/aborted requests and concurrent writes. Reconcile coin totals against the transaction ledger; the ledger remains the source of truth.

## References

- [Firestore pricing and free quota](https://firebase.google.com/docs/firestore/pricing)
- [Firestore Query Explain](https://firebase.google.com/docs/firestore/query-explain)
- [Firestore aggregation queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries)
- [Firestore transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
