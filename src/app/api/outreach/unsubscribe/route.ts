import { suppress, verifyUnsubscribeToken } from "@/lib/datapal/outreach";

export const dynamic = "force-dynamic";

const page = (title: string, message: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
      `<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f4f5f7;color:#1c2333"><div style="max-width:480px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #e3e6ec;border-radius:14px">` +
      `<div style="font-size:20px;font-weight:700;margin-bottom:12px">Bizz<span style="color:#8a6414">Pal</span></div><h1 style="font-size:18px;margin:0 0 10px">${title}</h1><p style="font-size:14px;line-height:1.6;color:#4a5468;margin:0">${message}</p></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

/** The link at the bottom of every email sent through BizzPal. Opening it is enough: nothing else to click. */
export async function GET(req: Request) {
  const email = verifyUnsubscribeToken(new URL(req.url).searchParams.get("t") || "");
  if (!email) return page("This link isn't valid", "The unsubscribe link looks incomplete or changed. If you keep receiving messages, write to care@bizzpal.ai and we will stop them.", 400);
  suppress(email);
  return page("You are unsubscribed", "You will not receive any more emails sent through BizzPal at this address. You can close this page.");
}

/** Mail programs use this for the one-click "Unsubscribe" button. */
export async function POST(req: Request) {
  const email = verifyUnsubscribeToken(new URL(req.url).searchParams.get("t") || "");
  if (!email) return new Response("invalid", { status: 400 });
  suppress(email);
  return new Response("ok", { status: 200 });
}
