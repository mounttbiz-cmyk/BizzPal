import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { ChatStoreError, createConversation, listConversations } from "@/lib/chat/conversations";

export const dynamic = "force-dynamic";

/** This person's saved advisor chats, newest first. ?agent=cfo for one advisor. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const agent = new URL(req.url).searchParams.get("agent") || undefined;
  return NextResponse.json({ success: true, conversations: listConversations(getUserBusinessId(auth.email), auth.email, agent) });
}

/** Saves a new chat: { agentId, messages } */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await req.json().catch(() => ({}));
    const conversation = createConversation(getUserBusinessId(auth.email), auth.email, String(b.agentId || ""), b.messages);
    return NextResponse.json({ success: true, conversation });
  } catch (err) {
    if (err instanceof ChatStoreError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    return NextResponse.json({ success: false, error: "Could not save the chat." }, { status: 500 });
  }
}
