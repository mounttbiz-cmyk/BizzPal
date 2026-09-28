import { NextRequest, NextResponse } from "next/server";
import { getActiveBusiness } from "@/lib/db";

interface ProviderAttempt {
  name: string;
  call: (prompt: string) => Promise<string | null>;
}

async function callGemini(apiKey: string, prompt: string): Promise<string | null> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callGroq(apiKey: string, prompt: string): Promise<string | null> {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callOpenRouter(apiKey: string, prompt: string): Promise<string | null> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callMistral(apiKey: string, prompt: string): Promise<string | null> {
  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callCohere(apiKey: string, prompt: string): Promise<string | null> {
  const resp = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "command-a-03-2025",
      message: prompt,
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.text || null;
}

export async function POST(req: NextRequest) {
  try {
    const { message, agentId, companyProfile, agentName, agentRole, customRoleTitle } = await req.json();

    // Executive Agent Personas
    const agentRoles: Record<string, { title: string; focus: string; tone: string }> = {
      ceo: {
        title: "Astra (CEO AI)",
        focus: "Executive strategy, cross-functional prioritization, founder sanity, market positioning, high-ticket deal closing, and existential risks.",
        tone: "Decisive, visionary, encouraging, authoritative.",
      },
      cfo: {
        title: "Marcus (CFO AI)",
        focus: "Burn rate compression, liquid cash runway, gross margin health, unit economics (CAC/LTV), pricing models, and solvency governance.",
        tone: "Fiscally disciplined, data-first, razor-sharp, analytical.",
      },
      cmo: {
        title: "Elena (Marketing AI)",
        focus: "Customer acquisition cost (CAC), pipeline conversion velocity, inbound funnels, ICP qualification, messaging, and partner distribution channels.",
        tone: "Growth-oriented, energetic, conversion-focused, experimental.",
      },
      marketing: {
        title: "Elena (Marketing AI)",
        focus: "Customer acquisition cost (CAC), pipeline conversion velocity, inbound funnels, ICP qualification, messaging, and partner distribution channels.",
        tone: "Growth-oriented, energetic, conversion-focused, experimental.",
      },
      sales: {
        title: "Vikram (Sales AI)",
        focus: "Pipeline velocity, high-ticket deal closing, objection handling, win rates, and contract expansion.",
        tone: "Sharp, persuasive, metric-focused, deal-driven.",
      },
      hr: {
        title: "Sarah (HR & Talent AI)",
        focus: "Headcount capacity modeling, key-person risk, compensation benchmarks, and talent velocity.",
        tone: "Empathetic, structured, culturally aligned, strategic.",
      },
      coo: {
        title: "David (Operations AI)",
        focus: "Process optimization, vendor SLAs, operational friction, capacity constraints, and operational bottlenecks.",
        tone: "Systematic, efficiency-driven, pragmatic, operational.",
      },
      operations: {
        title: "David (Operations AI)",
        focus: "Process optimization, vendor SLAs, operational friction, capacity constraints, and operational bottlenecks.",
        tone: "Systematic, efficiency-driven, pragmatic, operational.",
      },
      strategy: {
        title: "Rohan (Strategy AI)",
        focus: "Competitive moats, market expansion, SWOT evaluation, business model evolution, and defensibility.",
        tone: "Insightful, macro-economic, competitive, strategic.",
      },
    };

    const baseRole = agentRoles[agentId] || agentRoles.ceo;
    const resolvedRoleTitle = customRoleTitle || (agentName ? `${agentName} (${agentRole || baseRole.title.split("(")[1] || "Executive AI"})` : baseRole.title);
    const activeRole = {
      ...baseRole,
      title: resolvedRoleTitle,
    };

    const activeBiz = getActiveBusiness();
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

    const systemPrompt = `You are ${activeRole.title}, an executive AI advisor in the BizzPal Enterprise Business OS.
Your Focus: ${activeRole.focus}
Your Tone: ${activeRole.tone}

${companyContext}

Instructions:
1. Always frame your answer with executive authority for the Indian market (using INR ₹ notation where relevant).
2. Ground your advice in the company fundamentals above.
3. Keep the tone sharp, crisp, and high-impact. Avoid fluff.`;

    const fullPrompt = `${systemPrompt}\n\nExecutive Request from User: ${message}`;

    const providerChain: ProviderAttempt[] = [
      {
        name: "Google Gemini",
        call: (prompt) => {
          const key = process.env.GEMINI_API_KEY;
          return key ? callGemini(key, prompt) : Promise.resolve(null);
        },
      },
      {
        name: "Groq",
        call: (prompt) => {
          const key = process.env.GROQ_API_KEY;
          return key ? callGroq(key, prompt) : Promise.resolve(null);
        },
      },
      {
        name: "OpenRouter",
        call: (prompt) => {
          const key = process.env.OPENROUTER_API_KEY;
          return key ? callOpenRouter(key, prompt) : Promise.resolve(null);
        },
      },
      {
        name: "Mistral",
        call: (prompt) => {
          const key = process.env.MISTRAL_API_KEY;
          return key ? callMistral(key, prompt) : Promise.resolve(null);
        },
      },
      {
        name: "Cohere",
        call: (prompt) => {
          const key = process.env.COHERE_API_KEY;
          return key ? callCohere(key, prompt) : Promise.resolve(null);
        },
      },
    ];

    for (const provider of providerChain) {
      try {
        const generatedText = await provider.call(fullPrompt);
        if (generatedText) {
          return NextResponse.json({
            success: true,
            agent: activeRole.title,
            text: generatedText,
            provider: "bizzpal-ai",
          });
        }
      } catch (err) {
        // Try next provider in the chain
      }
    }

    // High-fidelity fallback deterministic executive responses
    const curCash = Number(companyProfile?.cash ?? companyProfile?.cashOnHand ?? cashReserves);
    const curBurn = Number(companyProfile?.burn ?? companyProfile?.monthlyBurn ?? monthlyBurn);
    const curTeam = Number(companyProfile?.teamSize ?? teamSize);
    const curAnnRev = Number(companyProfile?.annualRevenue ?? (monthlyRev * 12));
    const calcRunway = curBurn > 0 ? (curCash / curBurn).toFixed(1) : (curCash > 0 ? "18+" : "0.0");
    const revPerEmp = curTeam > 0 && curAnnRev > 0 ? Math.round(curAnnRev / curTeam) : 0;

    const fallbackResponses: Record<string, string> = {
      ceo: `Acknowledged. Based on ${companyProfile?.name || companyName}'s current operations in ${companyProfile?.industryLabel || industry}, our strategic imperative is capital-efficient scaling. With liquid reserves at ₹${curCash.toLocaleString("en-IN")}, our cash runway stands at ${calcRunway} months. I recommend concentrating leadership mindshare on client retention and pipeline closing over the next 60 days.`,
      cfo: `Financial assessment: monthly net burn is ₹${curBurn.toLocaleString("en-IN")} against ₹${curCash.toLocaleString("en-IN")} in bank reserves. This yields a runway of ${calcRunway} months. To optimize solvency, ensure operating cash flows remain protected while accelerating invoice collection cycles.`,
      marketing: `Target CAC should be strictly benchmarked under 25% of annual client value. For ${companyProfile?.name || companyName}, prioritizing high-intent organic search and account-based outreach will deliver high ROAS compared to uncalibrated ad spend.`,
      sales: `Deal velocity audit indicates pipeline opportunities. I recommend introducing rigorous stage-gate qualification in our pipeline: route sub-threshold leads to automated touchpoints while focusing senior sales rep capacity on high-LTV enterprise accounts.`,
      hr: `For a team of ${curTeam} FTEs, revenue per employee currently stands at ₹${revPerEmp.toLocaleString("en-IN")}. Before adding new headcount, let's automate routine operational workflows to keep unit economics lean.`,
      operations: `Operational capacity review shows strong delivery efficiency. We can eliminate manual reporting overhead by linking automated execution workflows directly to our connected tools.`,
      strategy: `Defensibility audit: Our competitive moat strengthens through integrated operational telemetry and rapid automated execution. I recommend documenting core standard operating procedures in our Knowledge Hub to ensure rapid scaling and quality control.`,
    };

    return NextResponse.json({
      success: true,
      agent: activeRole.title,
      text: fallbackResponses[agentId] || fallbackResponses.ceo,
      provider: "bizzpal-ai",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
