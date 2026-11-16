import { NextResponse } from "next/server";
import { db, getUserBusinessId, saveUserBusinessProfile } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const email = auth.email;
    let business: any = db.prepare("SELECT * FROM businesses WHERE id = ?").get(getUserBusinessId(email)) as any;
    if (!business) {
      const user = db.prepare("SELECT business_profile FROM registered_users WHERE LOWER(email) = ?").get(email) as any;
      if (user?.business_profile) {
        try {
          business = typeof user.business_profile === "string" ? JSON.parse(user.business_profile) : user.business_profile;
        } catch {}
      }
    }

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    let connectedTools = [];
    try {
      connectedTools = business.connected_tools ? (typeof business.connected_tools === "string" ? JSON.parse(business.connected_tools) : business.connected_tools) : [];
    } catch {}

    let dynamicAnswers = {};
    try {
      dynamicAnswers = business.dynamic_intake_answers ? (typeof business.dynamic_intake_answers === "string" ? JSON.parse(business.dynamic_intake_answers) : business.dynamic_intake_answers) : {};
    } catch {}

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        industry: business.industry,
        industryLabel: business.industry_label,
        founderName: business.founder_name,
        website: business.website,
        teamSize: business.team_size,
        annualRevenue: business.annual_revenue,
        monthlyRevenue: business.monthly_revenue,
        monthlyBurn: business.monthly_burn,
        cashOnHand: business.cash_on_hand,
        connectedTools,
        noIntegrations: Boolean(business.no_integrations),
        whatsappOptIn: Boolean(business.whatsapp_opt_in),
        whatsappNumber: business.whatsapp_number || "",
        logoUrl: business.logo_url || null,
        dynamicAnswers,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json();
    // Who this belongs to comes from the sign-in, never from the request body
    const userEmail = auth.email;
    const {
      name,
      industry,
      industryLabel,
      customIndustry,
      founderName,
      website,
      teamSize,
      annualRevenue,
      monthlyRevenue,
      monthlyBurn,
      cashOnHand,
      connectedTools = [],
      noIntegrations = false,
      whatsappOptIn = false,
      whatsappNumber = "",
      logoUrl,
      dynamicAnswers = {},
      structured,
    } = body;

    const now = new Date().toISOString();

    const targetBizId = getUserBusinessId(userEmail);

    // If structured daily input was received, calculate updated revenue / burn / cash
    let finalAnnualRevenue = annualRevenue;
    let finalMonthlyRevenue = monthlyRevenue;
    let finalMonthlyBurn = monthlyBurn;
    let finalCashOnHand = cashOnHand;

    if (structured) {
      if (structured.revenue) {
        finalMonthlyRevenue = Number(structured.revenue);
        finalAnnualRevenue = Number(structured.revenue) * 12;
      }
      if (structured.burn || structured.expenses) {
        finalMonthlyBurn = Number(structured.burn || structured.expenses);
      }
      if (structured.cash) {
        finalCashOnHand = Number(structured.cash);
      }
    }

    // 1. Update or create business record
    const existing = db.prepare("SELECT id FROM businesses WHERE id = ?").get(targetBizId);
    if (existing) {
      db.prepare(`
        UPDATE businesses SET
          name = COALESCE(?, name),
          industry = COALESCE(?, industry),
          industry_label = COALESCE(?, industry_label),
          custom_industry = COALESCE(?, custom_industry),
          founder_name = COALESCE(?, founder_name),
          website = COALESCE(?, website),
          team_size = COALESCE(?, team_size),
          annual_revenue = COALESCE(?, annual_revenue),
          monthly_revenue = COALESCE(?, monthly_revenue),
          monthly_burn = COALESCE(?, monthly_burn),
          cash_on_hand = COALESCE(?, cash_on_hand),
          connected_tools = COALESCE(?, connected_tools),
          no_integrations = COALESCE(?, no_integrations),
          whatsapp_opt_in = COALESCE(?, whatsapp_opt_in),
          whatsapp_number = COALESCE(?, whatsapp_number),
          logo_url = COALESCE(?, logo_url),
          dynamic_intake_answers = COALESCE(?, dynamic_intake_answers),
          updated_at = ?
        WHERE id = ?
      `).run(
        name ?? null,
        industry ?? null,
        industryLabel ?? null,
        customIndustry ?? null,
        founderName ?? null,
        website ?? null,
        teamSize ?? null,
        finalAnnualRevenue ?? null,
        finalMonthlyRevenue ?? null,
        finalMonthlyBurn ?? null,
        finalCashOnHand ?? null,
        connectedTools ? JSON.stringify(connectedTools) : null,
        noIntegrations !== undefined ? (noIntegrations ? 1 : 0) : null,
        whatsappOptIn !== undefined ? (whatsappOptIn ? 1 : 0) : null,
        whatsappNumber ?? null,
        logoUrl ?? null,
        dynamicAnswers ? JSON.stringify(dynamicAnswers) : null,
        now,
        targetBizId
      );
    } else {
      db.prepare(`
        INSERT INTO businesses (
          id, name, industry, industry_label, custom_industry, founder_name, website,
          team_size, annual_revenue, monthly_revenue, monthly_burn, cash_on_hand,
          connected_tools, no_integrations, whatsapp_opt_in, whatsapp_number,
          logo_url, dynamic_intake_answers, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        targetBizId,
        name || "Untitled Enterprise",
        industry || "saas",
        industryLabel || "Technology & Services",
        customIndustry || null,
        founderName || "Founder",
        website || null,
        teamSize ? Number(teamSize) : 1,
        finalAnnualRevenue ? Number(finalAnnualRevenue) : 0,
        finalMonthlyRevenue ? Number(finalMonthlyRevenue) : 0,
        finalMonthlyBurn ? Number(finalMonthlyBurn) : 0,
        finalCashOnHand ? Number(finalCashOnHand) : 0,
        connectedTools ? JSON.stringify(connectedTools) : JSON.stringify([]),
        noIntegrations ? 1 : 0,
        whatsappOptIn ? 1 : 0,
        whatsappNumber || null,
        logoUrl || null,
        dynamicAnswers ? JSON.stringify(dynamicAnswers) : null,
        now,
        now
      );
    }

    // 1b. Update registered_users record if userEmail provided
    if (userEmail) {
      saveUserBusinessProfile(userEmail, {
        name,
        industry,
        industryLabel,
        founderName,
        website,
        teamSize,
        logoUrl,
        annualRevenue: finalAnnualRevenue,
        monthlyRevenue: finalMonthlyRevenue,
        revenue: finalMonthlyRevenue,
        monthlyBurn: finalMonthlyBurn,
        burn: finalMonthlyBurn,
        cashOnHand: finalCashOnHand,
        cash: finalCashOnHand,
        connectedTools,
        updatedAt: now,
      });
    }

    // 2. Update integrations according to intake branching logic
    const allTools = ["stripe", "slack", "zoho_books", "google_calendar", "help_desk"];
    for (const toolKey of allTools) {
      const isSelected = !noIntegrations && Array.isArray(connectedTools) && connectedTools.includes(toolKey);
      const currentInt = db
        .prepare("SELECT status FROM integrations WHERE business_id = ? AND tool_key = ?")
        .get(targetBizId, toolKey) as any;

      let nextStatus = "not_connected";
      if (isSelected) {
        nextStatus = currentInt && currentInt.status === "connected" ? "connected" : "pending_connection";
      }

      db.prepare(`
        INSERT INTO integrations (id, business_id, tool_key, name, category, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(business_id, tool_key) DO UPDATE SET
          status = excluded.status,
          updated_at = excluded.updated_at
      `).run(
        `int_${targetBizId}_${toolKey}`,
        targetBizId,
        toolKey,
        toolKey === "stripe" ? "Stripe" : toolKey === "slack" ? "Slack" : toolKey === "zoho_books" ? "Zoho Books" : toolKey === "google_calendar" ? "Google Calendar" : "Help Desk",
        toolKey === "stripe" ? "payments" : toolKey === "slack" ? "communication" : toolKey === "zoho_books" ? "accounting" : toolKey === "google_calendar" ? "scheduling" : "support",
        nextStatus,
        now
      );
    }

    return NextResponse.json({
      success: true,
      businessId: targetBizId,
      message: "Business intake recorded successfully",
      connectedTools,
      noIntegrations,
      whatsappOptIn,
      whatsappNumber,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
