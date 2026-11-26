import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { ChatStoreError, deleteConversation, getConversation, updateConversation } from "@/lib/chat/conversations";

export const dynamic = "force-dynamic";

/** One saved chat with its messages. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const conversation = getConversation(getUserBusinessId(auth.email), auth.email, params.id);
  if (!conversation) return NextResponse.json({ success: false, error: "That chat was not found." }, { status: 404 });
  return NextResponse.json({ success: true, conversation });
}

/** Saves new messages and/or renames: { messages?, title? } */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await req.json().catch(() => ({}));
    const conversation = updateConversation(getUserBusinessId(auth.email), auth.email, params.id, { messages: b.messages, title: b.title });
    return NextResponse.json({ success: true, conversation });
  } catch (err) {
    if (err instanceof ChatStoreError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    return NextResponse.json({ success: false, error: "Could not save the chat." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const ok = deleteConversation(getUserBusinessId(auth.email), auth.email, params.id);
  if (!ok) return NextResponse.json({ success: false, error: "That chat was not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
