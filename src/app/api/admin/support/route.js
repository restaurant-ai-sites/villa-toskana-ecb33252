import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "../../../../lib/admin";
import { sb, PROJECT_ID } from "../../../../lib/booking";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await sb(
    `support_messages?project_id=eq.${PROJECT_ID}&order=created_at.desc&limit=50`
  ).catch(() => []);
  return NextResponse.json({ messages: rows || [] });
}

export async function POST(request) {
  try {
    const { name, email, message } = await request.json();
    if (!name || !message) return NextResponse.json({ error: "Name und Nachricht sind Pflichtfelder." }, { status: 400 });

    await sb(`support_messages`, {
      method: "POST",
      body: JSON.stringify({ project_id: PROJECT_ID, name, email: email || "", message, status: "new" }),
    });

    const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && adminChatId) {
      const text = `📩 Yeni destek mesajı!\n\nProje: ${PROJECT_ID}\nGönderen: ${name} (${email || "e-posta yok"})\n\n${message}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: adminChatId, text }),
      }).catch(() => null);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const { id, status } = await request.json();
  if (!id || !status) return NextResponse.json({ error: "id und status erforderlich." }, { status: 400 });
  await sb(`support_messages?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  return NextResponse.json({ ok: true });
}
