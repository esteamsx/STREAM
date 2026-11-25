const PAYMENT_CLAIM_STALE_MS = 5 * 60 * 1000;

export async function finalizeCoinCreditPayment({
  db,
  reference,
  paystackData,
  paymentCollection,
  ledgerType,
  getCoins,
  getLedgerMeta,
  increment,
  appendCoinLedger,
  invalidateProfileCache = () => {},
  linkedCollection = null,
  getLinkedId = null,
  now = () => Date.now(),
}) {
  const paymentRef = db.collection(paymentCollection).doc(reference);
  const result = await db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) return { notOurs: true };

    const record = paymentSnap.data();
    if (record.status === "success" || record.status === "needs_refund") {
      return { alreadyProcessed: true, uid: record.uid };
    }
    if (record.status === "claimed" && record.claimedAt && now() - record.claimedAt < PAYMENT_CLAIM_STALE_MS) {
      return { inProgress: true, uid: record.uid };
    }

    const currency = String(paystackData?.currency || "").toUpperCase();
    const paidAmount = Number(paystackData?.amount);
    const expectedAmount = Number(record.amountKobo);
    if (paystackData?.status !== "success" || currency !== "NGN"
      || !Number.isSafeInteger(paidAmount) || !Number.isSafeInteger(expectedAmount) || expectedAmount <= 0
      || paidAmount < expectedAmount) {
      tx.update(paymentRef, { status: "failed", failedAt: now() });
      return { failed: true };
    }

    const coins = Number(getCoins(record));
    if (!Number.isSafeInteger(coins) || coins <= 0) {
      throw new Error("The coin payment record has an invalid coin amount.");
    }

    const userRef = db.collection("users").doc(record.uid);
    const ledgerQuery = userRef.collection("coinLedger").where("meta.reference", "==", reference).limit(1);
    const linkedRef = linkedCollection && typeof getLinkedId === "function"
      ? db.collection(linkedCollection).doc(String(getLinkedId(record)))
      : null;
    const reads = [tx.get(userRef), tx.get(ledgerQuery)];
    if (linkedRef) reads.push(tx.get(linkedRef));
    const [userSnap, ledgerSnap] = await Promise.all(reads);
    const timestamp = now();

    // Older releases credited the user before marking the payment successful. Detect
    // that legacy ledger entry so a stale "claimed" payment can be safely recovered.
    if (!ledgerSnap.empty) {
      tx.update(paymentRef, { status: "success", confirmedAt: timestamp });
      if (linkedRef) tx.set(linkedRef, { paid: true, paidAt: timestamp, paidReference: reference }, { merge: true });
      return { alreadyProcessed: true, recovered: true, uid: record.uid, coins };
    }

    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const ledger = appendCoinLedger(tx, userRef, userData, coins, ledgerType, getLedgerMeta(record, reference));
    tx.set(userRef, { coinBalance: increment(coins), ...ledger }, { merge: true });
    tx.update(paymentRef, { status: "success", confirmedAt: timestamp });
    if (linkedRef) tx.set(linkedRef, { paid: true, paidAt: timestamp, paidReference: reference }, { merge: true });
    return { alreadyProcessed: false, uid: record.uid, coins };
  });

  if (result.failed) throw new Error("Payment was not successful.");
  if (result.inProgress) return { alreadyProcessed: true, uid: result.uid };
  if (result.notOurs) return result;
  if (!result.alreadyProcessed || result.recovered) invalidateProfileCache(result.uid);
  return result;
}
