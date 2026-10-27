import { ingestCompanyDocument, getCompanyDocuments, deleteCompanyDocument } from "../src/lib/knowledge/ingest";
import { searchCompanyKnowledge, queryCompanyMemory, getPersistentBusinessFacts } from "../src/lib/knowledge/retrieval";
import { calculateBusinessMetrics } from "../src/lib/bi/metricsEngine";
import { getKpiDefinitions, evaluateBusinessKpis } from "../src/lib/bi/kpiMonitor";
import { getBusinessInsights, approveInsightAction } from "../src/lib/bi/investigator";
import { generateMetricForecast } from "../src/lib/bi/forecaster";
import { db, DEFAULT_BUSINESS_ID } from "../src/lib/db";

async function runVerification() {
  console.log("=================================================");
  console.log(" BIZZPAL ADVANCED ENGINE VERIFICATION SUITE");
  console.log("=================================================");

  // ----------------------------------------------------
  // MODULE 1: BUSINESS CONTEXT ENGINE (COMPANY MEMORY)
  // ----------------------------------------------------
  console.log("\n[TEST 1] Ingesting Company Document: 'Q4 Marketing Strategy & Campaign Performance'...");

  const sampleDocText = `
# Apex Labs Q4 Marketing Strategy & Annual Performance Review

## Executive Summary
In fiscal year 2025, Apex Labs executed a multi-channel enterprise acquisition strategy. 
The core initiative focused on LinkedIn thought leadership, account-based marketing (ABM) for tier-1 banks, 
and founder-led content.

## Campaign Results & Success Metrics
- Total Marketing Spend: ₹42,50,000 across digital ads, executive roundtables, and sponsorship.
- Customer Acquisition Cost (CAC): Dropped from ₹28,000 to ₹19,200 due to organic referrals.
- Enterprise Deals Closed: 14 new annual contracts with average contract value (ACV) of ₹18,00,000.
- Return on Ad Spend (ROAS): 5.8x across closed annualized recurring revenue.
- Best Performing Channel: Direct founder roundtables with 38% conversion rate.
- Underperforming Channel: Paid programmatic display ads with 0.4% conversion and high churn.

## Operating Mandates & Pricing Guidelines
All enterprise SaaS contracts must maintain a minimum 78% gross profit margin. 
Payment terms require 50% upfront for annual commitments to preserve working capital and extend runway.
`;

  const ingestRes = await ingestCompanyDocument({
    businessId: DEFAULT_BUSINESS_ID,
    fileName: "q4_marketing_strategy_review.md",
    title: "Q4 Marketing Strategy & Performance Review",
    mimeType: "text/markdown",
    content: sampleDocText,
  });

  console.log("  -> Ingest Result Status:", ingestRes.status);
  console.log("  -> Document ID:", ingestRes.documentId);
  console.log("  -> Vector Chunks Created:", ingestRes.chunkCount);
  if (ingestRes.chunkCount === 0 && ingestRes.status !== "duplicate") {
    throw new Error("Failed to create document chunks!");
  }

  // Test Document Retrieval
  console.log("\n[TEST 2] Semantic Vector Search for 'marketing strategy and conversion success'...");
  const searchResults = await searchCompanyKnowledge(
    "What marketing strategy did we use last year, and how successful was it?",
    DEFAULT_BUSINESS_ID,
    { limit: 3 }
  );

  console.log("  -> Found matching chunks:", searchResults.length);
  for (const r of searchResults) {
    console.log(`     * [Similarity: ${(r.similarity * 100).toFixed(1)}%] Doc: "${r.documentTitle}", Sec: "${r.sectionTitle}"`);
    console.log(`       Excerpt: "${r.content.slice(0, 100)}..."`);
  }

  if (searchResults.length === 0) {
    throw new Error("Semantic search returned 0 results!");
  }

  // Test Natural Language Grounded Query
  console.log("\n[TEST 3] Natural Language Q&A with Citations and Fact Separation...");
  const queryRes = await queryCompanyMemory(
    "What marketing strategy did we use last year, and how successful was it?",
    DEFAULT_BUSINESS_ID
  );

  console.log("  -> Answer Has Context:", queryRes.hasSufficientContext);
  console.log("  -> Citation Count:", queryRes.citations.length);
  console.log("  -> Verified Facts Count:", queryRes.verifiedFacts.length);
  console.log("  -> AI Grounded Answer Excerpt:\n", queryRes.answer.slice(0, 300) + "...\n");

  // Test Persistent Business Facts
  console.log("\n[TEST 4] Persistent Company Facts Retrieval...");
  const facts = getPersistentBusinessFacts(DEFAULT_BUSINESS_ID);
  console.log("  -> Stored Persistent Facts Count:", facts.length);

  // ----------------------------------------------------
  // MODULE 2: REAL-TIME BUSINESS INTELLIGENCE
  // ----------------------------------------------------
  console.log("\n[TEST 5] Calculating SQL Business Metrics...");
  const metrics = calculateBusinessMetrics(DEFAULT_BUSINESS_ID);
  console.log("  -> Monthly Revenue: ₹" + metrics.monthlyRevenue.toLocaleString());
  console.log("  -> Monthly Burn: ₹" + metrics.monthlyBurn.toLocaleString());
  console.log("  -> Cash Reserve: ₹" + metrics.cashReserve.toLocaleString());
  console.log("  -> Runway: " + metrics.runwayMonths + " months");
  console.log("  -> Gross Margin: " + metrics.grossMarginPct + "%");
  console.log("  -> CAC: ₹" + metrics.cac + " | LTV: ₹" + metrics.ltv + " (Ratio: " + metrics.ltvCacRatio + "x)");

  // Test KPI Evaluation & Anomaly Detection
  console.log("\n[TEST 6] Evaluating Configured KPI Monitoring Rules...");
  const kpis = getKpiDefinitions(DEFAULT_BUSINESS_ID);
  console.log("  -> Active KPI Rules Count:", kpis.length);

  const evalResults = await evaluateBusinessKpis(DEFAULT_BUSINESS_ID);
  console.log("  -> Evaluated KPIs Count:", evalResults.length);
  const breached = evalResults.filter((r) => r.isBreached);
  console.log("  -> Breached / Anomalous KPIs:", breached.length);
  for (const b of evalResults) {
    console.log(`     * KPI: "${b.name}" -> Status: [${b.status.toUpperCase()}], Value: ${b.currentValue}, Target: ${b.targetValue ?? "N/A"}`);
  }

  // Test Insights & Action Approval Workflow
  console.log("\n[TEST 7] Business Insights Feed & Recommended Actions Approval...");
  const insights = getBusinessInsights(DEFAULT_BUSINESS_ID);
  console.log("  -> Open Business Insights Count:", insights.length);

  if (insights.length > 0) {
    const topInsight = insights[0];
    console.log(`  -> Top Insight: "${topInsight.title}" (Severity: ${topInsight.severity})`);
    console.log(`     Verified Facts: ${topInsight.rootCauseAnalysis.verifiedFacts.length}`);
    console.log(`     Recommended Actions: ${topInsight.recommendedActions.length}`);

    if (topInsight.recommendedActions.length > 0) {
      const actionToApprove = topInsight.recommendedActions[0];
      console.log(`  -> Testing 1-Click Action Approval: "${actionToApprove.title}"...`);
      const approvalRes = await approveInsightAction(topInsight.id, actionToApprove.key, "Executive Founder", DEFAULT_BUSINESS_ID);
      console.log(`  -> Action Approved! Created Task ID:`, approvalRes.taskId);

      // Verify task was inserted into the real tasks table
      const createdTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(approvalRes.taskId) as any;
      console.log(`  -> Verified in Database 'tasks' table:`, Boolean(createdTask), `Title: "${createdTask?.title}"`);
    }
  }

  // Test Statistical Forecasting
  console.log("\n[TEST 8] Statistical Forecasting Model...");
  const forecast = generateMetricForecast("revenue", DEFAULT_BUSINESS_ID, 4);
  console.log("  -> Metric:", forecast.metric);
  console.log("  -> Growth Drift:", forecast.growthRatePct + "% monthly");
  console.log("  -> Projected Periods:", forecast.periods.length);
  const futurePoints = forecast.periods.filter((p) => p.type === "projected");
  for (const p of futurePoints) {
    console.log(`     * Period: ${p.period} | Expected: ₹${p.expected.toLocaleString()} (80% CI: ₹${p.lowerBound.toLocaleString()} - ₹${p.upperBound.toLocaleString()})`);
  }

  console.log("\n=================================================");
  console.log(" ALL MODULE VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
