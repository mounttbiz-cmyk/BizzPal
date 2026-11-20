import { NextRequest, NextResponse } from "next/server";
import { getUserBusiness, getUserBusinessId } from "@/lib/db";
import { generateText, hasPaidPlan } from "@/lib/ai/providers";
import { requireUser } from "@/lib/auth/requireUser";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { searchCompanyKnowledge } from "@/lib/knowledge/retrieval";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Every message can cost money with the AI providers, so it needs an account and is rate limited.
    const ipLimit = rateLimit(`chat-ip:${clientIp(req)}`, 120, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } }
      );
    }

    const { message, agentId, companyProfile, agentName, agentRole, customRoleTitle, toolContext } = await req.json();

    const auth = requireUser(req);
    if (auth instanceof NextResponse) return auth;
    const accountEmail = auth.email;
    const userLimit = rateLimit(`chat-user:${accountEmail}`, 20, 60 * 1000);
    if (!userLimit.ok) {
      return NextResponse.json(
        { success: false, error: "You are sending messages too fast. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSec) } }
      );
    }
    if (typeof message !== "string" || !message.trim() || message.length > 6000) {
      return NextResponse.json({ success: false, error: "Please send a message of up to 6000 characters." }, { status: 400 });
    }

    // Executive Agent Personas
    const agentRoles: Record<string, { title: string; focus: string; tone: string }> = {
      ceo: {
        title: "CEO",
        focus: "Executive strategy, cross-functional prioritization, founder sanity, market positioning, high-ticket deal closing, and existential risks.",
        tone: "Decisive, visionary, encouraging, authoritative.",
      },
      cfo: {
        title: "CFO",
        focus: "Burn rate compression, liquid cash runway, gross margin health, unit economics (CAC/LTV), pricing models, and solvency governance.",
        tone: "Fiscally disciplined, data-first, razor-sharp, analytical.",
      },
      cmo: {
        title: "Marketing",
        focus: "Customer acquisition cost (CAC), pipeline conversion velocity, inbound funnels, ICP qualification, messaging, and partner distribution channels.",
        tone: "Growth-oriented, energetic, conversion-focused, experimental.",
      },
      marketing: {
        title: "Marketing",
        focus: "Customer acquisition cost (CAC), pipeline conversion velocity, inbound funnels, ICP qualification, messaging, and partner distribution channels.",
        tone: "Growth-oriented, energetic, conversion-focused, experimental.",
      },
      sales: {
        title: "Sales",
        focus: "Pipeline velocity, high-ticket deal closing, objection handling, win rates, and contract expansion.",
        tone: "Sharp, persuasive, metric-focused, deal-driven.",
      },
      hr: {
        title: "HR & Talent",
        focus: "Headcount capacity modeling, key-person risk, compensation benchmarks, and talent velocity.",
        tone: "Empathetic, structured, culturally aligned, strategic.",
      },
      coo: {
        title: "Operations",
        focus: "Process optimization, vendor SLAs, operational friction, capacity constraints, and operational bottlenecks.",
        tone: "Systematic, efficiency-driven, pragmatic, operational.",
      },
      operations: {
        title: "Operations",
        focus: "Process optimization, vendor SLAs, operational friction, capacity constraints, and operational bottlenecks.",
        tone: "Systematic, efficiency-driven, pragmatic, operational.",
      },
      strategy: {
        title: "Strategy",
        focus: "Competitive moats, market expansion, SWOT evaluation, business model evolution, and defensibility.",
        tone: "Insightful, macro-economic, competitive, strategic.",
      },
    };

    const baseRole = agentRoles[agentId] || agentRoles.ceo;
    const resolvedRoleTitle = customRoleTitle || (agentName ? (agentRole ? `${agentName} (${agentRole})` : agentName) : baseRole.title);
    const activeRole = {
      ...baseRole,
      title: resolvedRoleTitle,
    };

    const activeBiz = getUserBusiness(accountEmail);
    const resolvedProfile = companyProfile || activeBiz || {};
    const companyName = resolvedProfile.name || "Enterprise";
    const founderName = resolvedProfile.founderName || resolvedProfile.founder_name || "Founder";
    const industry = resolvedProfile.industryLabel || resolvedProfile.industry_label || resolvedProfile.industry || "Enterprise";
    const monthlyRev = Number(resolvedProfile.revenue || resolvedProfile.monthly_revenue || resolvedProfile.monthlyRevenue || 0);
    const monthlyBurn = Number(resolvedProfile.burn || resolvedProfile.monthly_burn || resolvedProfile.monthlyBurn || 0);
    const cashReserves = Number(resolvedProfile.cash || resolvedProfile.cash_on_hand || resolvedProfile.cashOnHand || 0);
    const teamSize = resolvedProfile.teamSize || resolvedProfile.team_size || 1;

    const companyContext = `
Company Context:
- Company Name: ${companyName}
- Founder / Leader: ${founderName}
- Industry: ${industry}
- Monthly Revenue: ₹${monthlyRev.toLocaleString("en-IN")}
- Monthly Net Burn: ₹${monthlyBurn.toLocaleString("en-IN")}
- Liquid Cash Reserves: ₹${cashReserves.toLocaleString("en-IN")}
- Team Size: ${teamSize} FTEs
`;

    // Retrieve relevant company memory chunks if available
    let memoryEvidence = "";
    try {
      const bizId = getUserBusinessId(accountEmail);
      const chunks = await searchCompanyKnowledge(message, bizId, { limit: 2, minSimilarity: 0.55 });
      if (chunks.length > 0) {
        memoryEvidence = `\nRelevant Company Memory & Documents:\n` + chunks.map(c => `- [${c.documentTitle} / ${c.sectionTitle || "General"}]: ${c.content.slice(0, 300)}`).join("\n") + "\n";
      }
    } catch {}

    const toolInstruction = toolContext?.name
      ? `\nActive Tool Context: You are currently assisting the founder with the "${toolContext.name}" tool (${toolContext.category || "General"}${toolContext.badge ? ` / ${toolContext.badge}` : ""}). Directly address and apply this tool's analytical methodology, variables, and strategic levers to their company numbers.\n`
      : "";

    const systemPrompt = `You are ${activeRole.title}, an executive AI advisor in the BizzPal Enterprise Business OS.
Your Focus: ${activeRole.focus}
Your Tone: ${activeRole.tone}

${companyContext}
${memoryEvidence}
${toolInstruction}
Instructions:
1. Always frame your answer with executive authority for the Indian market (using INR ₹ notation where relevant).
2. Ground your advice in the company fundamentals and verified memory above.
3. Keep the tone sharp, crisp, and high-impact. Avoid fluff.
4. COMPLETION GUARANTEE: You must always generate a complete, coherent response and conclude all tables, bullet points, and strategic phases. Never stop in the middle of a sentence, list, or markdown table. Always finish with a clear next step or conclusion.`;

    const fullPrompt = `${systemPrompt}\n\nExecutive Request from User: ${message}`;

    const generatedText = await generateText(fullPrompt, hasPaidPlan(accountEmail));
    if (generatedText) {
      return NextResponse.json({
        success: true,
        agent: activeRole.title,
        text: generatedText,
        provider: "bizzpal-ai",
      });
    }

    // No provider answered. Say so plainly instead of showing pre-written advice.
    return NextResponse.json(
      { success: false, error: "The AI advisor can't answer right now. Please try again in a moment." },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
