# ES TEAMS TV: Live TV stutter, investigation and fix

## Root cause
Both playback paths use the same server proxy (/api/v1/hls/...), the same upstream URLs and headers. The stream is identical. The difference is the page the video sits in. Three rendering costs in views/live-tv.js force the browser to re-composite the page, with the video underneath, on every frame:

1. `body{animation:bootFlicker ... both}`. The fill mode `both` keeps the last keyframe, so the whole page (video included) permanently has `filter: brightness(1) contrast(1)`. Visually a no-op, but it forces the entire page through an offscreen filter pass forever.
2. Every `.ch-btn` (sidebar and "more channels" panel, hundreds per category) had `backdrop-filter: blur(8/12/14px)` on a nearly transparent button over a solid sidebar. The blur is invisible, but each button is its own blur layer.
3. `.mc-btn` media buttons had `backdrop-filter` while the controls bar is at opacity 0 almost all the time.

## Fix (views/live-tv.js, CSS only)
- bootFlicker fill mode `both` to `backwards` (animation still plays, filter is released afterwards).
- Removed backdrop-filter from `.ch-btn`, `.ch-btn:hover`, `.ch-btn.active`.
- `.mc-btn` blur now applies only while the controls are visible (hover or controls-visible).
No JS, HLS config, API, URL, layout or theme changes.

## Files changed
- views/live-tv.js
- test/live-tv-player-resilience.test.js (2 regression tests added)

## Test results (headless Chromium, software rendering, real page HTML, VP9 test clip, 400 synthetic channel buttons, page frames in 12s, 720 = 60fps)
- Desktop 1366x768: original 173/173/180 frames, 120+ long gaps (worst 167ms). Fixed 516/488/471, 13-18 long gaps (worst 83ms).
- Mobile 390x844, 4x CPU throttle: original 479/459/381, up to 31 long gaps (worst 200ms). Fixed 628/584/622, 1-2 long gaps (worst 50ms).
- Bisect: body filter alone cost about 40 percent of frames, sidebar button blur and overlay blur most of the rest. The brightness filter on the video element was not measurable here and was left alone.
- node --test: 366 pass, 3 fail. The same 3 fail on the untouched original (device-security-regression, moviebox-origin-admin-signals, movies), unrelated.

## Not verified (be aware)
- No access to the live site, real streams or hls.js from my sandbox, so HLS playback itself, long sessions, real channel switching and real phones were not run. Code review found no duplicate HLS instances (destroy plus listener teardown plus loadSeq guard on switch) and no extra polling.
- Absolute fps is pessimistic (software rendering). Expect a smaller but same-direction gain on real GPUs.
- Not testable offline: AdSense script, and public/devtools-guard.js (if DevTools is open it hammers debugger every 250ms, so never judge smoothness with DevTools open).
- Lazy loading: categories already load on demand, so I did not restructure. A category still returns all its channels at once; capping or windowing very large categories is a possible later step, unproven.
