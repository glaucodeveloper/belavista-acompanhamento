const cents = (value) => Math.round(Number(value) || 0);
const reasonPriority = Object.freeze({ signal: 0, intermediate: 1, monthly: 2 });
const reasonSplit = Object.freeze({ signal: [50, 50], intermediate: [50, 50], monthly: [70, 30] });
const asDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? new Date(`${value}T12:00:00Z`) : null;
const isoDate = (date) => date.toISOString().slice(0, 10);
const addMonths = (value, months) => {
  const date = asDate(value);
  if (!date) return null;
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return isoDate(date);
};
const monthsBetween = (from, to) => {
  const a = asDate(from), b = asDate(to);
  return a && b ? Math.max(0, (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()) : 0;
};

/** Reconciles persisted receipts and configured installment plans; it never supplies financial defaults. */
export const calculateRepasseReportV1 = (sales = [], reasons = [], today = new Date().toISOString().slice(0, 10)) => {
  const reasonById = new Map(reasons.map((reason) => [String(reason.id), reason]));
  return sales.map((sale) => {
    const rate = Number(sale.brokerRule?.commissionPercent);
    const configured = sale.brokerRule?.active === true && Number.isFinite(rate);
    const receipts = [...(sale.receipts || [])].sort((a, b) =>
      (reasonPriority[a.repasseReasonId] ?? 9) - (reasonPriority[b.repasseReasonId] ?? 9) || String(a.date).localeCompare(String(b.date)),
    );
    const receivedCents = receipts.reduce((sum, item) => sum + cents(item.amountCents), 0);
    const basePriceCents = cents(sale.plan?.contractPriceCents || Number(sale.tablePrice?.price) * 100 || sale.valueCents);
    const remainingCents = Math.max(0, basePriceCents - receivedCents);
    const current = receipts.map((receipt) => {
      const reason = reasonById.get(receipt.repasseReasonId);
      if (!configured || !reason) return { ...receipt, reasonLabel: reason?.label || "Razão não configurada", commissionCents: null, primaryCents: null, partnerCents: null };
      const commissionCents = Math.round(cents(receipt.amountCents) * rate / 100 * Number(reason.sharePercent || 0) / 100);
      const [primary, partner] = reasonSplit[reason.id] || [100, 0];
      return { ...receipt, reasonLabel: reason.label, commissionCents, primaryCents: Math.round(commissionCents * primary / 100), partnerCents: commissionCents - Math.round(commissionCents * primary / 100) };
    });
    const plan = sale.plan;
    if (!configured || !plan || remainingCents <= 0) return {
      saleId: sale.id, basePriceCents, receivedCents, remainingCents, current,
      future: [], forecastStatus: !configured ? "commission-rule-required" : !plan ? "payment-plan-required" : "settled",
    };
    const monthlyCount = Number(plan.monthlyInstallments) || 0;
    const semiannualCount = Number(plan.semiannualInstallments) || 0;
    if ((monthlyCount && !asDate(plan.monthlyFirstDueDate)) || (semiannualCount && !asDate(plan.semiannualFirstDueDate))) return {
      saleId: sale.id, basePriceCents, receivedCents, remainingCents, current, future: [], forecastStatus: "payment-plan-incomplete",
    };
    const semiannualShare = Number(plan.semiannualPrincipalPercent) / 100;
    const buckets = [];
    if (monthlyCount) for (let i = 0; i < monthlyCount; i++) buckets.push({
      reasonId: "monthly", date: addMonths(plan.monthlyFirstDueDate, i),
      principalCents: Math.round(remainingCents * (1 - semiannualShare) / monthlyCount),
    });
    if (semiannualCount) for (let i = 0; i < semiannualCount; i++) buckets.push({
      reasonId: "intermediate", date: addMonths(plan.semiannualFirstDueDate, i * 6),
      principalCents: Math.round(remainingCents * semiannualShare / semiannualCount),
    });
    buckets.sort((a, b) => a.date.localeCompare(b.date) || (reasonPriority[a.reasonId] ?? 9) - (reasonPriority[b.reasonId] ?? 9));
    const annualRate = Number(plan.annualInterestPercent) / 100;
    let balance = remainingCents, accruedFrom = today, principalAssigned = 0;
    const future = buckets.map((bucket, index) => {
      const principalCents = index === buckets.length - 1 ? Math.max(0, remainingCents - principalAssigned) : Math.min(bucket.principalCents, Math.max(0, remainingCents - principalAssigned));
      principalAssigned += principalCents;
      const periods = monthsBetween(accruedFrom, bucket.date);
      const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
      const interestCents = Math.max(0, Math.round(balance * (Math.pow(1 + monthlyRate, periods) - 1)));
      const amountCents = principalCents + interestCents;
      const reason = reasonById.get(bucket.reasonId);
      const commissionCents = reason ? Math.round(amountCents * rate / 100 * Number(reason.sharePercent || 0) / 100) : null;
      const [primary, partner] = reasonSplit[bucket.reasonId] || [100, 0];
      balance = Math.max(0, balance - principalCents);
      accruedFrom = bucket.date;
      return { date: bucket.date, reasonId: bucket.reasonId, reasonLabel: reason?.label || bucket.reasonId, principalCents, interestCents, amountCents, balanceCents: balance, commissionCents, primaryCents: commissionCents === null ? null : Math.round(commissionCents * primary / 100), partnerCents: commissionCents === null ? null : commissionCents - Math.round(commissionCents * primary / 100) };
    });
    return { saleId: sale.id, basePriceCents, receivedCents, remainingCents, current, future, forecastStatus: "ready" };
  });
};
