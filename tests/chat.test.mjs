// Saved advisor chats: a chat is kept for the person who had it, can be reopened, renamed and deleted, and nobody
// else can see or change it.
import { call, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const stamp = Date.now();
const OWNER = `chat_owner_${stamp}@example.test`;
const OTHER = `chat_other_${stamp}@example.test`;

const msg = (sender, content, extra = {}) => ({ id: `${sender}_${Math.random().toString(36).slice(2)}`, sender, agentId: "cfo", agentName: "CFO", avatar: "Landmark", timestamp: "", content, ...extra });

try {
  for (const e of [OWNER, OTHER]) await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "ChatTest123!" } });
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);

  t.check("saved chats need sign-in", (await call("/api/chat/conversations")).status === 401);
  t.check("a chat must start with a question", (await call("/api/chat/conversations", { method: "POST", cookie: owner, body: { agentId: "cfo", messages: [msg("agent", "Hi")] } })).status === 400);
  t.check("an unknown advisor is refused", (await call("/api/chat/conversations", { method: "POST", cookie: owner, body: { agentId: "Robert'); DROP", messages: [msg("user", "Hi")] } })).status === 400);

  const long = "How much cash runway do we have if sales drop by twenty percent over the next two quarters and costs stay flat?";
  const created = await call("/api/chat/conversations", {
    method: "POST",
    cookie: owner,
    body: { agentId: "cfo", messages: [msg("user", long, { attachments: [{ name: "p&l.xlsx", size: 10, type: "x", previewUrl: "blob:http://x/1" }] }), msg("agent", "About 7 months.")] },
  });
  const chat = created.json?.conversation;
  t.check("a chat is saved with both sides of the conversation", created.status === 200 && chat?.messages?.length === 2);
  t.check("it is named after the first question, shortened", chat?.title?.startsWith("How much cash runway") && chat.title.length <= 60 && chat.title.endsWith("…"));
  t.check("local file previews are not stored", !JSON.stringify(chat).includes("blob:"));

  const list = (await call("/api/chat/conversations?agent=cfo", { cookie: owner })).json?.conversations || [];
  t.check("it is listed under that advisor", list.some(c => c.id === chat.id));
  t.check("it is not listed under another advisor", !((await call("/api/chat/conversations?agent=ceo", { cookie: owner })).json?.conversations || []).some(c => c.id === chat.id));

  const more = [...chat.messages, msg("user", "And if we cut tools by 15%?"), msg("agent", "About 8 months.")];
  const upd = await call(`/api/chat/conversations/${chat.id}`, { method: "PUT", cookie: owner, body: { messages: more } });
  t.check("new messages are added to the same chat", upd.json?.conversation?.messages?.length === 4);
  const reopened = await call(`/api/chat/conversations/${chat.id}`, { cookie: owner });
  t.check("the chat can be reopened with every message", reopened.json?.conversation?.messages?.at(-1)?.content === "About 8 months.");

  const renamed = await call(`/api/chat/conversations/${chat.id}`, { method: "PUT", cookie: owner, body: { title: "  Runway   check " } });
  t.check("a chat can be renamed", renamed.json?.conversation?.title === "Runway check");
  t.check("an empty name is refused", (await call(`/api/chat/conversations/${chat.id}`, { method: "PUT", cookie: owner, body: { title: "   " } })).status === 400);

  t.check("another person cannot open it", (await call(`/api/chat/conversations/${chat.id}`, { cookie: other })).status === 404);
  t.check("another person does not see it in their list", !((await call("/api/chat/conversations", { cookie: other })).json?.conversations || []).some(c => c.id === chat.id));
  t.check("another person cannot change it", (await call(`/api/chat/conversations/${chat.id}`, { method: "PUT", cookie: other, body: { title: "x" } })).status === 404);
  t.check("another person cannot delete it", (await call(`/api/chat/conversations/${chat.id}`, { method: "DELETE", cookie: other })).status === 404);

  const big = Array.from({ length: 260 }, (_, i) => msg(i % 2 ? "agent" : "user", `m${i}`));
  const capped = await call(`/api/chat/conversations/${chat.id}`, { method: "PUT", cookie: owner, body: { messages: big } });
  t.check("a very long chat keeps its latest 200 messages", capped.json?.conversation?.messages?.length === 200 && capped.json.conversation.messages.at(-1).content === "m259");

  t.check("the owner can delete it", (await call(`/api/chat/conversations/${chat.id}`, { method: "DELETE", cookie: owner })).status === 200);
  t.check("once deleted it is gone", (await call(`/api/chat/conversations/${chat.id}`, { cookie: owner })).status === 404);
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
}
// The accounts made here are removed by tests/cleanup.mjs after the run
process.exit(t.done() ? 0 : 1);
