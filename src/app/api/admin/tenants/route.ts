import { NextResponse } from "next/server";
import { db, setPlatformConfig } from "@/lib/db";
import { deleteUserFromFirebase } from "@/lib/firebase/adminDelete";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const businesses = db.prepare("SELECT * FROM businesses ORDER BY updated_at DESC").all() as any[];
    const users = db.prepare("SELECT id, email, name, provider, business_profile, created_at FROM registered_users ORDER BY created_at DESC").all() as any[];

    // Ensure every registered user has a corresponding enterprise in businesses
    const existingBizIds = new Set(businesses.map((b) => b.id));
    const now = new Date().toISOString();

    for (const u of users) {
      if (!u.email) continue;
      const cleanEmail = u.email.trim().toLowerCase();
      const expectedBizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Check if user has an enterprise matching their generated ID, or founder name
      const alreadyHasBiz = businesses.some(
        (b) => b.id === expectedBizId || (b.founder_name && b.founder_name.toLowerCase() === (u.name || "").toLowerCase())
      );

      if (!alreadyHasBiz && !existingBizIds.has(expectedBizId)) {
        let p: any = {};
        if (u.business_profile) {
          try {
            p = typeof u.business_profile === "string" ? JSON.parse(u.business_profile) : u.business_profile;
          } catch {}
        }
        const bizName = p.name || (u.name ? `${u.name}'s Enterprise` : `${cleanEmail.split('@')[0]}'s Enterprise`);
        const founder = u.name || p.founderName || "Founder";
        const createdAt = u.created_at || now;

        try {
          db.prepare(`
            INSERT INTO businesses (
              id, name, founder_name, industry, industry_label, website, team_size,
              annual_revenue, monthly_revenue, monthly_burn, cash_on_hand,
              connected_tools, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            expectedBizId,
            bizName,
            founder,
            p.industry || "saas",
            p.industryLabel || "Technology & Services",
            p.website || "",
            Number(p.teamSize || 1),
            Number(p.annualRevenue || (p.revenue ? p.revenue * 12 : 0)),
            Number(p.monthlyRevenue || p.revenue || 0),
            Number(p.monthlyBurn || p.burn || 0),
            Number(p.cashOnHand || p.cash || 0),
            JSON.stringify(p.connectedTools || []),
            createdAt,
            createdAt
          );

          existingBizIds.add(expectedBizId);
          businesses.push({
            id: expectedBizId,
            name: bizName,
            founder_name: founder,
            industry: p.industry || "saas",
            industry_label: p.industryLabel || "Technology & Services",
            website: p.website || "",
            team_size: p.teamSize || 1,
            annual_revenue: p.annualRevenue || (p.revenue ? p.revenue * 12 : 0),
            monthly_revenue: p.monthlyRevenue || p.revenue || 0,
            monthly_burn: p.monthlyBurn || p.burn || 0,
            cash_on_hand: p.cashOnHand || p.cash || 0,
            connected_tools: JSON.stringify(p.connectedTools || []),
            created_at: createdAt,
            updated_at: createdAt,
          });
        } catch (insertErr) {
          console.warn("Could not backfill user enterprise:", insertErr);
        }
      }
    }

    // Map user details to each business
    const userByEmail: Record<string, any> = {};
    const userByName: Record<string, any> = {};
    for (const u of users) {
      if (u.email) userByEmail[u.email.toLowerCase()] = u;
      if (u.name) userByName[u.name.toLowerCase()] = u;
    }

    // Calculate aggregated platform metrics for the Superadmin dashboard
    let totalAnnualRev = 0;
    let totalMonthlyRev = 0;
    let totalBurn = 0;
    let totalCash = 0;

    const formattedBusinesses = businesses.map((b) => {
      const annRev = Number(b.annual_revenue || 0);
      const monRev = Number(b.monthly_revenue || 0);
      const burn = Number(b.monthly_burn || 0);
      const cash = Number(b.cash_on_hand || 0);

      totalAnnualRev += annRev;
      totalMonthlyRev += monRev;
      totalBurn += burn;
      totalCash += cash;

      const runwayMo = burn > 0 ? (cash / burn).toFixed(1) : cash > 0 ? "18+" : "0.0";

      let connectedToolsList: string[] = [];
      try {
        connectedToolsList = JSON.parse(b.connected_tools || "[]");
      } catch {}

      // Find associated user record if any
      let matchingUser: any = null;
      if (b.id && b.id.startsWith("biz_")) {
        const emailSlug = b.id.replace("biz_", "");
        for (const em of Object.keys(userByEmail)) {
          if (em.replace(/[^a-zA-Z0-9]/g, '_') === emailSlug) {
            matchingUser = userByEmail[em];
            break;
          }
        }
      }
      if (!matchingUser && b.founder_name) {
        matchingUser = userByName[b.founder_name.toLowerCase()] || null;
      }

      return {
        id: b.id,
        name: b.name || "Untitled Enterprise",
        founderName: b.founder_name || "Founder",
        industry: b.industry || "saas",
        industryLabel: b.industry_label || "Enterprise",
        website: b.website || "",
        teamSize: Number(b.team_size || 1),
        annualRevenue: annRev,
        monthlyRevenue: monRev,
        monthlyBurn: burn,
        cashOnHand: cash,
        runwayMonths: runwayMo,
        connectedTools: connectedToolsList,
        ownerEmail: matchingUser?.email || null,
        ownerName: matchingUser?.name || null,
        authProvider: matchingUser?.provider || null,
        isRegisteredUser: Boolean(matchingUser),
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        businesses: formattedBusinesses,
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          provider: u.provider || "email",
          createdAt: u.created_at,
        })),
        stats: {
          totalBusinesses: formattedBusinesses.length,
          totalUsers: users.length,
          totalAnnualRevenue: totalAnnualRev,
          totalMonthlyRevenue: totalMonthlyRev,
          totalCashReserves: totalCash,
          totalMonthlyBurn: totalBurn,
        },
      },
    });
  } catch (error: any) {
    console.error("Superadmin tenants GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      founderName,
      industry,
      industryLabel,
      annualRevenue,
      monthlyRevenue,
      monthlyBurn,
      cashOnHand,
      teamSize,
      website,
      setActive,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Business ID is required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE businesses SET
        name = COALESCE(?, name),
        founder_name = COALESCE(?, founder_name),
        industry = COALESCE(?, industry),
        industry_label = COALESCE(?, industry_label),
        annual_revenue = COALESCE(?, annual_revenue),
        monthly_revenue = COALESCE(?, monthly_revenue),
        monthly_burn = COALESCE(?, monthly_burn),
        cash_on_hand = COALESCE(?, cash_on_hand),
        team_size = COALESCE(?, team_size),
        website = COALESCE(?, website),
        updated_at = ?
      WHERE id = ?
    `).run(
      name || null,
      founderName || null,
      industry || null,
      industryLabel || null,
      annualRevenue !== undefined ? Number(annualRevenue) : null,
      monthlyRevenue !== undefined ? Number(monthlyRevenue) : null,
      monthlyBurn !== undefined ? Number(monthlyBurn) : null,
      cashOnHand !== undefined ? Number(cashOnHand) : null,
      teamSize !== undefined ? Number(teamSize) : null,
      website !== undefined ? website : null,
      now,
      id
    );

    // If setActive requested, mark as active tenant in platform settings & touch updated_at
    if (setActive) {
      db.prepare("UPDATE businesses SET updated_at = ? WHERE id = ?").run(now, id);
      setPlatformConfig("active_tenant_id", id);
      try {
        const { setFirestoreConfig } = require("@/lib/firebase/firestoreService");
        setFirestoreConfig("active_tenant_id", id);
      } catch {}
    }

    // Mirror to Firestore
    try {
      const { saveFirestoreBusinessRecord } = require("@/lib/firebase/firestoreService");
      saveFirestoreBusinessRecord(id, {
        name,
        founderName,
        industry,
        industryLabel,
        annualRevenue,
        monthlyRevenue,
        monthlyBurn,
        cashOnHand,
        teamSize,
        website,
        updatedAt: now,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Business "${name || id}" updated successfully.`,
    });
  } catch (error: any) {
    console.error("Superadmin tenants PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      founderName = "Founder",
      industry = "saas",
      industryLabel = "B2B SaaS & Tech",
      annualRevenue = 0,
      monthlyRevenue = 0,
      monthlyBurn = 0,
      cashOnHand = 0,
      teamSize = 5,
      website = "",
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Business name is required" }, { status: 400 });
    }

    const id = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO businesses (
        id, name, founder_name, industry, industry_label, website, team_size,
        annual_revenue, monthly_revenue, monthly_burn, cash_on_hand,
        connected_tools, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      founderName.trim(),
      industry,
      industryLabel,
      website.trim(),
      Number(teamSize),
      Number(annualRevenue),
      Number(monthlyRevenue),
      Number(monthlyBurn),
      Number(cashOnHand),
      JSON.stringify([]),
      now,
      now
    );

    return NextResponse.json({
      success: true,
      id,
      message: `New enterprise "${name.trim()}" created successfully.`,
    });
  } catch (error: any) {
    console.error("Superadmin tenants POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const userEmail = searchParams.get("userEmail");

    if (businessId) {
      // Delete business and associated records
      db.prepare("DELETE FROM businesses WHERE id = ?").run(businessId);
      db.prepare("DELETE FROM integrations WHERE business_id = ?").run(businessId);
      db.prepare("DELETE FROM tasks WHERE business_id = ?").run(businessId);
      db.prepare("DELETE FROM daily_checkins WHERE business_id = ?").run(businessId);

      return NextResponse.json({
        success: true,
        message: `Business ${businessId} and its associated records purged.`,
      });
    }

    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      const bizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const row = db.prepare("SELECT id FROM registered_users WHERE LOWER(email) = ?").get(cleanEmail) as any;

      // Remove the Firebase side first so a failure there is reported, not hidden.
      const firebase = await deleteUserFromFirebase(cleanEmail, row?.id);

      db.prepare("DELETE FROM registered_users WHERE LOWER(email) = ?").run(cleanEmail);
      // The user's enterprise and everything hanging off it
      for (const table of ["integrations", "tasks", "daily_checkins"]) {
        try { db.prepare(`DELETE FROM ${table} WHERE business_id = ?`).run(bizId); } catch {}
      }
      db.prepare("DELETE FROM businesses WHERE id = ?").run(bizId);

      const notes: string[] = [];
      if (!firebase.configured) notes.push("Firebase not cleaned: set FIREBASE_SERVICE_ACCOUNT on the server.");
      else if (firebase.errors.length) notes.push(`Firebase issues: ${firebase.errors.join("; ")}`);

      return NextResponse.json({
        success: true,
        firebase,
        message: `User ${userEmail} removed.${notes.length ? " " + notes.join(" ") : " Also removed from Firebase."}`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Specify businessId or userEmail to delete" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Superadmin tenants DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
