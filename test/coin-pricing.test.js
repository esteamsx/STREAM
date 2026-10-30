import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../services/auth.js", import.meta.url), "utf8");
const account = readFileSync(new URL("../views/account.js", import.meta.url), "utf8");

test("coin package prices and payment-link rate follow the new pricing", () => {
  const expectedPackages = {
    pack25: [25, 375],
    pack50: [50, 750],
    pack150: [150, 1875],
    pack350: [350, 3375],
    pack500: [500, 4500],
    pack1000: [1000, 7500],
    pack2000: [2000, 15000],
    pack3000: [3000, 22500],
  };
  for (const [key, [coins, priceNgn]] of Object.entries(expectedPackages)) {
    assert.match(auth, new RegExp(`${key}: \\{ coins: ${coins}, priceNgn: ${priceNgn} \\}`));
  }
  assert.match(auth, /const COIN_REQUEST_NGN_PER_COIN = 12\.5;/);
});

test("Buy Coins stays two columns with an internal scroll area and highlighted Popular price", () => {
  assert.match(account, /\.rw-buy-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[^}]*max-height:410px[^}]*overflow-y:auto/);
  assert.match(account, /@media\(max-width:359px\)\{ \.rw-buy-grid\{grid-template-columns:1fr/);
  assert.match(account, /\.rw-buy-item-cost\.popular\{[^}]*box-shadow:[^}]*rgba\(124,92,255/);
  assert.match(account, /presentation\.badge === 'POPULAR'/);
  assert.match(account, /pack2000: \{ label: 'Mega Pack' \}/);
  assert.match(account, /pack3000: \{ label: 'Max Pack' \}/);
});
