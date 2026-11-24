# Security and Liquid Glass reference notes

- Apple Liquid Glass documentation: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Apple Materials HIG: https://developer.apple.com/design/human-interface-guidelines/materials
- OWASP ASVS: https://asvs.owasp.org/ (latest stable result: ASVS 5.0.0, May 2025)
- OWASP WSTG latest: https://wstg.owasp.org/latest/

Implementation notes from the existing repository:
- `services/auth.js` already implements shared OTP issuing/checking with 5-minute expiry, 5 attempts, 30-second resend cooldown, HMAC hashing, and transactional attempt counting.
- `public/email-verification.js` already provides the site email OTP Liquid Glass overlay and accepts custom request/confirm handlers.
- `routes/devices.js` currently allows authenticated trusted-device removal but does not require email OTP.
- `services/device-sessions.js` already validates ownership of trusted-device records before grouped removal and updates only the requesting user's records.
- `services/auth.js#createDeviceSession` currently creates an in-app `new_login` notification when prior sessions are kicked, but no email alert.
- `middleware/security-middleware.js` already supplies Helmet, security headers, report-only CSP, same-origin write protection, input/query guards, and rate limiter classes. Changes should preserve these existing controls.
- The site already uses dark blue/purple accents, transparent glass surfaces, `public/ios-motion.js`, reduced-motion CSS, and existing logo assets such as `/favicon.svg`; no new visual system is needed.
- There is no existing account localization architecture. A language preference should be stored server-side and the UI must state that only the preference is saved unless translations exist.
