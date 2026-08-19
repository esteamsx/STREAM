import { siteHeadFor } from "../../config/site.js";
import { musicPlayerStyle, musicPlayerHtml, musicPlayerScript } from "../music-player.js";

const CATEGORIES = [
  {
    name: "WhatsApp",
    adminOnly: true,
    tools: [
      { href: "/channel-react", name: "Channel Reaction", desc: "Paste a WhatsApp channel post link and your deployed bot runs the reaction for you.", icon: `<path fill="currentColor" stroke="none" d="M12.04 2.02c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 004.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9a9.84 9.84 0 00-2.9-7A9.82 9.82 0 0012.04 2.02zm0 1.8c2.16 0 4.19.84 5.72 2.37a8.05 8.05 0 012.37 5.73c0 4.47-3.63 8.1-8.1 8.1a8.1 8.1 0 01-4.12-1.13l-.3-.18-3.06.8.82-3-.19-.31a8.03 8.03 0 01-1.24-4.29c0-4.47 3.63-8.1 8.1-8.1z"/><path fill="currentColor" stroke="none" d="M9.51 7.36c-.18-.4-.36-.41-.53-.42h-.45c-.16 0-.41.06-.63.3-.21.24-.82.8-.82 1.96s.84 2.27.96 2.43c.12.16 1.63 2.6 4 3.55 1.97.78 2.38.63 2.81.59.43-.04 1.38-.56 1.58-1.11.19-.55.19-1.02.14-1.12-.06-.1-.22-.16-.45-.28-.24-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.53.12-.15.24-.6.76-.74.92-.13.16-.27.18-.51.06-.23-.12-.98-.36-1.87-1.15-.69-.62-1.16-1.38-1.29-1.61-.14-.24-.02-.36.1-.48.11-.11.24-.28.35-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.52-1.28-.74-1.76z"/>` },
    ],
  },
  {
    name: "Network & Security",
    tools: [
      { href: "/tools/dns-lookup", name: "DNS Lookup", desc: "Look up A, AAAA, MX, TXT, NS, CNAME and SOA records.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z"/>` },
      { href: "/tools/ssl-checker", name: "SSL Certificate Checker", desc: "Check a domain's TLS certificate: issuer, expiry, validity.", icon: `<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>` },
      { href: "/tools/whois", name: "WHOIS Lookup", desc: "Domain registration info: owner, registrar, dates.", icon: `<circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/>` },
      { href: "/tools/user-agent-parser", name: "User Agent Parser", desc: "Break down a User-Agent string into browser, OS, device.", icon: `<rect x="4" y="3" width="16" height="12" rx="2"/><path stroke-linecap="round" d="M9 21h6M12 15v6"/>` },
      { href: "/tools/subnet-calculator", name: "Subnet / CIDR Calculator", desc: "Network range, broadcast address and host count.", icon: `<circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path stroke-linecap="round" d="M7 12h5M12 12l5-6M12 12l5 6"/>` },
      { href: "/tools/ip-lookup", name: "IP Address Lookup", desc: "Geolocation and ISP info for any IP address.", icon: `<circle cx="12" cy="10" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z"/>` },
      { href: "/tools/http-headers", name: "HTTP Headers Inspector", desc: "See the response headers any site sends back.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h10M7 13h10M7 17h6"/>` },
      { href: "/tools/password-hash", name: "Secure Password Hash", desc: "Generate or verify a salted scrypt password hash.", icon: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>` },
      { href: "/tools/totp-tool", name: "TOTP Generator / Tester", desc: "Generate a 2FA secret and code, or verify one.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/>` },
      { href: "/tools/api-tester", name: "API Request Tester", desc: "Send HTTP requests and inspect the response, right from your browser.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 6l-6 6 6 6M15 6l6 6-6 6"/>` },
      { href: "/tools/ws-tester", name: "WebSocket Tester", desc: "Connect to a WebSocket endpoint, send messages, watch the log.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>` },
    ],
  },
  {
    name: "Developer Tools",
    tools: [
      { href: "/tools/json-formatter", name: "JSON Formatter", desc: "Format and validate JSON, pretty-printed.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 4a2 2 0 00-2 2v3a2 2 0 01-2 2 2 2 0 012 2v3a2 2 0 002 2M17 4a2 2 0 012 2v3a2 2 0 002 2 2 2 0 00-2 2v3a2 2 0 01-2 2"/>` },
      { href: "/tools/jwt-decode", name: "JWT Decoder", desc: "Decode a JSON Web Token's header and payload.", icon: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/><circle cx="12" cy="16" r="1.4"/>` },
      { href: "/tools/base64", name: "Base64 Encode / Decode", desc: "Encode text to Base64, or decode it back.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h4M7 13h6M7 17h3"/>` },
      { href: "/tools/regex-tester", name: "Regex Tester", desc: "Test a regular expression and see every match.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 4v16M15 4v16M4 9h16M4 15h16"/>` },
      { href: "/tools/hash-generator", name: "Hash Generator", desc: "MD5, SHA-1, SHA-256 and SHA-512 for text or files.", icon: `<path stroke-linecap="round" d="M5 9h14M5 15h14M9 3L7 21M17 3l-2 18"/>` },
      { href: "/tools/obfuscate", name: "JavaScript Obfuscator", desc: "Obfuscate JavaScript source code instantly.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-12M6 9l-3 3 3 3M18 9l3 3-3 3"/>` },
      { href: "/tools/timestamp-converter", name: "Timestamp Converter", desc: "Unix timestamps to and from human-readable dates.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/>` },
      { href: "/tools/url-encoder", name: "URL Encoder / Decoder", desc: "Percent-encode or decode text for URLs.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07L11 5"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07L13 19"/>` },
      { href: "/tools/html-entity", name: "HTML Entity Encoder / Decoder", desc: "Escape or unescape HTML special characters.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>` },
      { href: "/tools/hex-text", name: "Hex ↔ Text Converter", desc: "Convert text to hexadecimal and back.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h2m2 0h2m2 0h2M7 15h10"/>` },
      { href: "/tools/binary-text", name: "Binary ↔ Text Converter", desc: "Convert text to binary and back.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 4v16M15 4v16M4 9l3 3-3 3M21 9l-3 3 3 3"/>` },
      { href: "/tools/caesar-cipher", name: "ROT13 / Caesar Cipher", desc: "Shift letters by any amount, including ROT13.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v9l6 3"/>` },
      { href: "/tools/base-converter", name: "Number Base Converter", desc: "Binary, octal, decimal and hexadecimal, any base.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>` },
      { href: "/tools/find-replace", name: "Find & Replace", desc: "Find and replace text, with optional regex support.", icon: `<circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/>` },
      { href: "/tools/csv-json", name: "CSV ⇄ JSON Converter", desc: "Convert CSV data to JSON, or JSON back to CSV.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M8 9h8M8 13h8M8 17h5"/>` },
      { href: "/tools/yaml-json", name: "YAML ⇄ JSON Converter", desc: "Convert YAML to JSON, or JSON back to YAML.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M8 9h8M8 13h8M8 17h5"/>` },
      { href: "/tools/json-diff", name: "JSON Diff", desc: "Compare two JSON structures and see what changed.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M7 4a2 2 0 00-2 2v3a2 2 0 01-2 2 2 2 0 012 2v3a2 2 0 002 2M17 4a2 2 0 012 2v3a2 2 0 002 2 2 2 0 00-2 2v3a2 2 0 01-2 2"/>` },
      { href: "/tools/contrast-checker", name: "Contrast Checker", desc: "Check colors against WCAG accessibility guidelines.", icon: `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18z" fill="currentColor" stroke="none"/>` },
      { href: "/tools/markdown-preview", name: "Markdown Previewer", desc: "Write Markdown and see the rendered HTML instantly.", icon: `<rect x="3" y="5" width="18" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 15V9l3 3 3-3v6M17 9v6M14.5 12.5L17 15l2.5-2.5"/>` },
      { href: "/tools/text-encrypt", name: "Text Encryption", desc: "Encrypt or decrypt text with a passphrase, entirely in your browser.", icon: `<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>` },
      { href: "/tools/typing-test", name: "Typing Speed Test", desc: "Test your typing speed and accuracy.", icon: `<rect x="3" y="5" width="18" height="14" rx="2"/><path stroke-linecap="round" d="M7 9h.01M11 9h.01M15 9h.01M7 13h6"/>` },
      { href: "/tools/cron-explainer", name: "Cron Expression Explainer", desc: "What a cron schedule means, and when it next runs.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/>` },
      { href: "/tools/minify-beautify", name: "Code Minifier / Beautifier", desc: "Minify or beautify JS, CSS and HTML.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M8 4l-6 8 6 8M16 4l6 8-6 8"/>` },
      { href: "/tools/robots-txt", name: "robots.txt Generator", desc: "Build a robots.txt to control search engine crawling.", icon: `<rect x="4" y="8" width="16" height="12" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 8V6a3 3 0 016 0v2M9 13h.01M15 13h.01"/>` },
      { href: "/tools/sitemap-xml", name: "Sitemap.xml Generator", desc: "Turn a list of page URLs into a valid sitemap.xml.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 12h18M12 3a15 15 0 010 18a15 15 0 010-18"/>` },
      { href: "/tools/sql-format", name: "SQL Formatter", desc: "Turn messy SQL into a clean, indented query.", icon: `<ellipse cx="12" cy="5" rx="8" ry="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>` },
      { href: "/tools/json-schema-validate", name: "JSON Schema Validator", desc: "Check a JSON document against a JSON Schema.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>` },
      { href: "/tools/file-type-detector", name: "File Type Detector", desc: "Detect a file's real format from its magic bytes.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M14 3v5h5M6 3h8l5 5v13H6z"/><path stroke-linecap="round" d="M9 13h6M9 16h6"/>` },
    ],
  },
  {
    name: "Generators",
    tools: [
      { href: "/tools/password-generator", name: "Password Generator", desc: "Strong, cryptographically random passwords.", icon: `<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>` },
      { href: "/tools/qr-code", name: "QR Code Generator", desc: "Turn any text or URL into a scannable QR code.", icon: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM14 20h3M20 14v3M20 20h.01"/>` },
      { href: "/tools/uuid-generator", name: "UUID Generator", desc: "Generate RFC 4122 v4 UUIDs.", icon: `<rect x="3" y="8" width="18" height="8" rx="2"/><path stroke-linecap="round" d="M7 8v8M12 8v8M17 8v8"/>` },
      { href: "/tools/random-number", name: "Random Number Generator", desc: "Cryptographically random integers within a range.", icon: `<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/>` },
      { href: "/tools/dice-roller", name: "Coin Flip / Dice Roller", desc: "Flip a coin or roll dice with any number of sides.", icon: `<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="12" cy="12" r="1"/>` },
      { href: "/tools/lorem-ipsum", name: "Lorem Ipsum Generator", desc: "Placeholder paragraphs for mockups and layouts.", icon: `<path d="M4 6h16M4 12h16M4 18h10"/>` },
      { href: "/tools/color-converter", name: "Color Converter", desc: "Convert between Hex, RGB and HSL.", icon: `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 000 18 4.5 4.5 0 000-9h1a3 3 0 000-6"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10" cy="7" r="1"/>` },
      { href: "/tools/fake-data", name: "Fake Data Generator", desc: "Realistic fake names, emails and addresses for testing.", icon: `<circle cx="9" cy="8" r="3.2"/><path stroke-linecap="round" d="M3.5 20a5.5 5.5 0 0111 0M16 8.5a3 3 0 010 6M20.5 20a5 5 0 00-6-4.9"/>` },
      { href: "/tools/css-gradient", name: "CSS Gradient Generator", desc: "Pick colors, get ready-to-use CSS gradient code.", icon: `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 3l18 18" stroke-linecap="round"/>` },
      { href: "/tools/name-generator", name: "Business Name Generator", desc: "10 brandable name ideas from your keyword.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/>` },
      { href: "/tools/favicon-generator", name: "Favicon Generator", desc: "Every favicon size you need, from one uploaded image.", icon: `<rect x="3" y="3" width="18" height="18" rx="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M8 13l2.5 2.5L16 10"/>` },
      { href: "/tools/meme-text", name: "Meme Text Generator", desc: "Add classic top/bottom captions to any image.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 15l5-5 4 4 5-6 4 5"/>` },
      { href: "/tools/signature-generator", name: "Signature Generator", desc: "Draw a signature and export it as a transparent PNG.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 17c3-6 5 4 8-2s5 4 8-3"/><path stroke-linecap="round" d="M3 21h18"/>` },
    ],
  },
  {
    name: "Text Tools",
    tools: [
      { href: "/tools/fancy-text", name: "Fancy Text Generator", desc: "30 stylish Unicode fonts: bold, script, circled and more.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 7V5h16v2M9 5v14m0 0h6M9 19H9"/>` },
      { href: "/tools/word-counter", name: "Word & Character Counter", desc: "Count words, characters, sentences and paragraphs.", icon: `<path d="M4 6h16M4 12h10M4 18h16"/>` },
      { href: "/tools/case-converter", name: "Case Converter", desc: "UPPER, lower, Title, camelCase, snake_case and more.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 20l4-14 4 14M5.5 15h5M14 20V6h4a3 3 0 010 6h-4"/>` },
      { href: "/tools/slug-generator", name: "Slug Generator", desc: "Turn any text into a clean, URL-friendly slug.", icon: `<path stroke-linecap="round" d="M6 12h12M6 8h12M6 16h8"/>` },
      { href: "/tools/dedupe-lines", name: "Duplicate Line Remover", desc: "Remove duplicate lines from a block of text.", icon: `<path d="M4 6h16M4 12h11M4 18h11"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 15l-2 2-2-2"/>` },
      { href: "/tools/sort-lines", name: "Text Sorter", desc: "Sort lines alphabetically or numerically.", icon: `<path stroke-linecap="round" d="M7 6h13M7 12h9M7 18h5"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 16l1.5 2L6 16"/><path d="M4.5 6v12"/>` },
      { href: "/tools/text-diff", name: "Text Diff Checker", desc: "Compare two blocks of text and see what changed.", icon: `<path stroke-linecap="round" d="M8 3v18M16 3v18M3 9h5M16 9h5M3 15h5M16 15h5"/>` },
      { href: "/tools/ascii-art", name: "ASCII Art Banner Generator", desc: "Turn short text into big block-letter banner art.", icon: `<rect x="3" y="3" width="18" height="18" rx="2"/><path stroke-linecap="round" d="M7 9h10M7 13h6"/>` },
    ],
  },
  {
    name: "Fun & Misc",
    tools: [
      { href: "/tools/roman-numeral", name: "Roman Numeral Converter", desc: "Convert between numbers and Roman numerals.", icon: `<path stroke-linecap="round" d="M5 6v12M9 6v12M13 6l4 12M20 6l-4 12"/>` },
      { href: "/tools/age-calculator", name: "Age Calculator", desc: "Exact age in years, months and days from a birth date.", icon: `<rect x="3" y="5" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M3 10h18M8 3v4M16 3v4"/>` },
      { href: "/tools/number-to-words", name: "Number ⇄ Words Converter", desc: "Spell out numbers as words, or parse words into a number.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 20l4-14 4 14M5.5 15h5M14 20V6h4a3 3 0 010 6h-4"/>` },
      { href: "/tools/morse-code", name: "Morse Code Translator", desc: "Translate text to Morse code and back.", icon: `<circle cx="5" cy="12" r="1.6"/><circle cx="10" cy="12" r="1.6"/><path stroke-linecap="round" d="M14 12h2M18 12h2"/>` },
      { href: "/tools/percentage-calculator", name: "Percentage Calculator", desc: "Percentage-of, what-percent, and percent change.", icon: `<circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path stroke-linecap="round" d="M19 5L5 19"/>` },
      { href: "/tools/bmi-calculator", name: "BMI Calculator", desc: "Body Mass Index from your height and weight.", icon: `<circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3.5 2"/>` },
      { href: "/tools/tip-calculator", name: "Tip Calculator", desc: "Tip amount, total, and per-person split.", icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>` },
      { href: "/tools/random-quote", name: "Random Quote Generator", desc: "An inspiring quote whenever you need one.", icon: `<path d="M7 8a3 3 0 00-3 3v2a3 3 0 003 3h1v3l-3-1M17 8a3 3 0 00-3 3v2a3 3 0 003 3h1v3l-3-1"/>` },
      { href: "/tools/countdown-timer", name: "Countdown Timer / Stopwatch", desc: "Set a countdown, or run a stopwatch.", icon: `<circle cx="12" cy="13" r="8"/><path stroke-linecap="round" d="M12 9v4l3 2M9 2h6"/>` },
      { href: "/tools/colorblind-simulator", name: "Color Blindness Simulator", desc: "Preview an image as someone with color vision deficiency would see it.", icon: `<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.4" fill="currentColor" stroke="none"/><path stroke-linecap="round" d="M8 15.5c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5"/>` },
      { href: "/tools/speech-tools", name: "Speech-to-Text / Text-to-Speech", desc: "Dictate with your mic, or have text read aloud.", icon: `<rect x="9" y="2" width="6" height="12" rx="3"/><path stroke-linecap="round" d="M5 10a7 7 0 0014 0M12 17v5M8 22h8"/>` },
      { href: "/tools/qr-scanner", name: "QR Code Scanner", desc: "Upload a QR code image and decode its contents.", icon: `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path stroke-linecap="round" d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01"/>` },
      { href: "/tools/ocr-tool", name: "Image Text Extractor (OCR)", desc: "Pull editable text out of any image.", icon: `<rect x="3" y="4" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M7 9h10M7 13h7M7 17h4"/>` },
    ],
  },
];

export function renderToolsIndex(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("tools")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark3:#ECEEF3;--card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  display:flex;flex-direction:column;position:relative;
}
.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.5;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.45;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.32;top:38%;left:50%;transform:translate(-50%,-50%)}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}
a{color:inherit;text-decoration:none}
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.wrap{width:100%;max-width:860px;margin:0 auto;display:flex;flex-direction:column;min-height:0;flex:1;position:relative;z-index:1}
.tools-header{flex-shrink:0;padding:24px 24px 0}
.back-row{margin-bottom:14px}
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:.82rem;font-weight:600}
.back-link:hover{color:var(--accent)}
.back-link svg{width:16px;height:16px}
.page-logo{
  display:flex;align-items:center;gap:10px;margin-bottom:20px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
h1{font-family:var(--font-display);font-size:1.6rem;margin-bottom:6px}
.subtitle{color:var(--muted);font-size:.88rem;margin-bottom:16px;line-height:1.6;max-width:52ch}
.search-wrap{position:relative;margin-bottom:18px}
.search-wrap svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--muted)}
#toolSearch{
  width:100%;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px 11px 38px;color:var(--text);font-family:var(--font-body);font-size:.85rem;
}
#toolSearch:focus{outline:2px solid var(--accent);outline-offset:-1px}
.tools-scroll{flex:1;min-height:0;overflow-y:auto;padding:0 24px 32px}
.tool-category{margin-bottom:22px}
.tool-category-title{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px}
.tools-grid{display:grid;grid-template-columns:1fr;gap:12px}
@media(min-width:640px){ .tools-grid{grid-template-columns:1fr 1fr} }
.tool-link-card{
  display:flex;gap:14px;align-items:flex-start;
  background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:0 10px 26px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.12);
  border-radius:14px;padding:16px;transition:border-color .18s var(--ease),transform .1s var(--ease);
}
:root[data-theme="light"] .tool-link-card{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 10px 26px rgba(20,20,28,.08),inset 0 1px 0 rgba(255,255,255,.6);
}
.tool-link-card:hover{border-color:var(--border-strong);transform:translateY(-1px)}
.tool-link-icon{
  width:36px;height:36px;border-radius:10px;background:var(--card2);display:flex;align-items:center;
  justify-content:center;color:var(--accent);flex-shrink:0;
}
.tool-link-icon svg{width:18px;height:18px}
.tool-link-name{font-weight:700;font-size:.92rem;margin-bottom:3px}
.tool-link-desc{font-size:.78rem;color:var(--muted);line-height:1.5}
.no-results{color:var(--muted);font-size:.85rem;padding:20px 0;text-align:center;display:none}
.scroll-top-btn{
  position:absolute;right:20px;bottom:76px;width:42px;height:42px;border-radius:50%;
  background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04121a;border:none;
  display:none;align-items:center;justify-content:center;box-shadow:0 8px 22px rgba(0,0,0,.35);
  transition:opacity .2s var(--ease),transform .15s var(--ease);z-index:20;
}
.scroll-top-btn.show{display:flex}
.scroll-top-btn:hover{transform:translateY(-2px)}
.scroll-top-btn:active{transform:scale(.94)}
.scroll-top-btn svg{width:20px;height:20px}
${musicPlayerStyle()}
</style>
</head>
<body>
<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>
<div class="wrap">
  <div class="tools-header">
    <div class="back-row">
      <a href="/" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
        Back
      </a>
    </div>
    <div class="page-logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      ES TEAMS TV
    </div>
    <h1>Free Tools</h1>
    <p class="subtitle">Free, fast, no ads. 3 uses a day per tool, unlimited once your account is verified.</p>
    <div class="search-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="toolSearch" placeholder="Search tools…" autocomplete="off" spellcheck="false">
    </div>
  </div>
  <div class="tools-scroll" id="toolsScroll">
    <div id="toolsContainer">
      ${CATEGORIES.map((cat) => `
      <div class="tool-category" data-category${cat.adminOnly ? " data-admin-only" : ""}${cat.adminOnly ? ' style="display:none"' : ""}>
        <div class="tool-category-title">${cat.name}</div>
        <div class="tools-grid">
          ${cat.tools.map((t) => `
          <a class="tool-link-card" href="${t.href}" data-name="${t.name.toLowerCase()}" data-desc="${t.desc.toLowerCase()}">
            <span class="tool-link-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${t.icon}</svg></span>
            <span>
              <span class="tool-link-name" style="display:block">${t.name}</span>
              <span class="tool-link-desc">${t.desc}</span>
            </span>
          </a>`).join("")}
        </div>
      </div>`).join("")}
    </div>
    <div class="no-results" id="noResults">No tools match your search.</div>
  </div>
  <button class="scroll-top-btn" id="scrollTopBtn" type="button" aria-label="Scroll to top">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5M5 12l7-7 7 7"/></svg>
  </button>
</div>
${musicPlayerHtml()}
<script nonce="__CSP_NONCE__">
(function(){
  var adminBlocks = document.querySelectorAll('[data-admin-only]');
  if (adminBlocks.length) {
    fetch('/api/channel/targets').then(function(r){
      if (r.ok) adminBlocks.forEach(function(b){ b.style.display = ''; });
    }).catch(function(){});
  }
  var searchInput = document.getElementById('toolSearch');
  var categories = Array.prototype.slice.call(document.querySelectorAll('[data-category]'));
  var noResults = document.getElementById('noResults');
  searchInput.addEventListener('input', function(){
    var q = searchInput.value.trim().toLowerCase();
    var anyVisible = false;
    categories.forEach(function(cat){
      var cards = Array.prototype.slice.call(cat.querySelectorAll('.tool-link-card'));
      var catHasMatch = false;
      cards.forEach(function(card){
        var match = !q || card.dataset.name.indexOf(q) !== -1 || card.dataset.desc.indexOf(q) !== -1;
        card.style.display = match ? '' : 'none';
        if (match) catHasMatch = true;
      });
      cat.style.display = catHasMatch ? '' : 'none';
      if (catHasMatch) anyVisible = true;
    });
    noResults.style.display = anyVisible ? 'none' : 'block';
  });

  var scrollEl = document.getElementById('toolsScroll');
  var scrollTopBtn = document.getElementById('scrollTopBtn');
  scrollEl.addEventListener('scroll', function(){
    scrollTopBtn.classList.toggle('show', scrollEl.scrollTop > 200);
  });
  scrollTopBtn.addEventListener('click', function(){
    scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
${musicPlayerScript()}
</script>
</body>
</html>`;
}
