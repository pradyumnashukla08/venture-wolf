export function computeScenarioFinancials(
  scenario: any, 
  archetype: 'SAAS' | 'MANUFACTURING' | 'SERVICES'
): Record<string, number[]> {
  
  const years = [1, 2, 3, 4, 5];
  
  // 14 Metrics
  const totalRevenue: number[] = [];
  const totalCogs: number[] = [];
  const grossProfit: number[] = [];
  const grossMarginPct: number[] = [];
  const totalOpEx: number[] = [];
  const ebitda: number[] = [];
  const ebitdaPct: number[] = [];
  const depreciation: number[] = [];
  const ebit: number[] = [];
  const interest: number[] = [];
  const pbt: number[] = [];
  const taxes: number[] = [];
  const pat: number[] = [];
  const patPct: number[] = [];

  let currentMonthlyRevenue = scenario.initialMetric;

  // Assuming initial debt load is roughly 3x starting annualized revenue (just to model interest)
  let debtLoad = (currentMonthlyRevenue * 12) * 3;
  if (debtLoad < 100000) debtLoad = 1000000; // minimum debt floor for model realism

  // Payroll baseline (say 35% of revenue starting out)
  let annualPayroll = (currentMonthlyRevenue * 12) * 0.35;
  if (annualPayroll < 500000) annualPayroll = 2000000; // floor

  for (let year = 1; year <= 5; year++) {
    let yearRevenue = 0;

    // Apply Law of Large Numbers (Growth Decay)
    if (year > 1) {
      if (archetype === 'SAAS') {
        // SaaS MoM growth decays aggressively as the MRR base scales to prevent explosive Year 4/5 outputs
        scenario.growthRateOrYield = scenario.growthRateOrYield * 0.60;
      } else {
        // Annual growth rates decay slightly year-over-year
        scenario.growthRateOrYield = scenario.growthRateOrYield * 0.85;
      }
    }

    // Monthly compounding loop
    for (let month = 1; month <= 12; month++) {
      if (archetype === 'SAAS') {
        // Growth - Churn
        currentMonthlyRevenue = currentMonthlyRevenue * (1 + scenario.growthRateOrYield) * (1 - scenario.pricingMetric);
      } else {
        // Flat growth amortized monthly
        currentMonthlyRevenue = currentMonthlyRevenue * (1 + (scenario.growthRateOrYield / 12));
        // Annual price inflation hits in month 1
        if (month === 1) {
          currentMonthlyRevenue = currentMonthlyRevenue * (1 + scenario.pricingMetric);
        }
      }
      yearRevenue += currentMonthlyRevenue;
    }

    // 1. Total Revenue
    totalRevenue.push(Math.round(yearRevenue));

    // 2. Total COGS
    const cogs = Math.round(yearRevenue * scenario.cogsMargin);
    totalCogs.push(cogs);

    // 3. Gross Profit
    const gp = Math.round(yearRevenue - cogs);
    grossProfit.push(gp);

    // 4. Gross Margin %
    grossMarginPct.push(yearRevenue > 0 ? Number((gp / yearRevenue).toFixed(4)) : 0);

    // 5. OpEx (Payroll + Marketing)
    // Payroll increments yearly + PF burden
    annualPayroll = annualPayroll * (1 + scenario.annualPayrollIncrease);
    const totalPayroll = annualPayroll * (1 + scenario.employerPfBurden);
    const marketing = yearRevenue * scenario.marketingSpendPct;
    const opex = Math.round(totalPayroll + marketing);
    totalOpEx.push(opex);

    // 6. EBITDA
    const currentEbitda = gp - opex;
    ebitda.push(currentEbitda);

    // 7. EBITDA %
    ebitdaPct.push(yearRevenue > 0 ? Number((currentEbitda / yearRevenue).toFixed(4)) : 0);

    // 8. Depreciation (Roughly 5% for SaaS/Services, 12% for Mfg)
    const daRate = archetype === 'MANUFACTURING' ? 0.12 : 0.05;
    const da = Math.round(yearRevenue * daRate);
    depreciation.push(da);

    // 9. EBIT
    const currentEbit = currentEbitda - da;
    ebit.push(currentEbit);

    // 10. Interest
    const interestExpense = Math.round(debtLoad * scenario.interestRateOnDebt);
    interest.push(interestExpense);
    // Pay down debt slightly if cashflow is positive
    if (currentEbit > interestExpense) {
      debtLoad = debtLoad * 0.9;
    } else {
      debtLoad = debtLoad * 1.1; // debt trap
    }

    // 11. PBT
    const currentPbt = currentEbit - interestExpense;
    pbt.push(currentPbt);

    // 12. Taxes
    let taxExpense = 0;
    if (currentPbt > 0) {
      const isTaxHoliday = scenario.dpiitTaxHolidayActive === 1 && year <= 3;
      if (!isTaxHoliday) {
        taxExpense = Math.round(currentPbt * 0.25);
      }
    }
    taxes.push(taxExpense);

    // 13. PAT
    const currentPat = currentPbt - taxExpense;
    pat.push(currentPat);

    // 14. PAT %
    patPct.push(yearRevenue > 0 ? Number((currentPat / yearRevenue).toFixed(4)) : 0);
  }

  return {
    "1. Total Revenue": totalRevenue,
    "2. Total COGS": totalCogs,
    "3. Gross Profit": grossProfit,
    "A. Gross Margin %": grossMarginPct,
    "4. Total Operating Expenses": totalOpEx,
    "5. EBITDA": ebitda,
    "B. EBITDA %": ebitdaPct,
    "6. Depreciation & Amortisation": depreciation,
    "7. EBIT": ebit,
    "8. Interest": interest,
    "9. PBT": pbt,
    "10. Taxes": taxes,
    "11. PAT": pat,
    "C. PAT %": patPct
  };
}
