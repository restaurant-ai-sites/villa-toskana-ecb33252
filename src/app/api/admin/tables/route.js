import { NextResponse } from "next/server";
import { sb, PROJECT_ID, getTables } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  return NextResponse.json({ tables: await getTables() });
}

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const { table_number, seats } = await request.json();
    if (!table_number || !seats) {
      return NextResponse.json({ error: "Tischnummer und Sitzplätze erforderlich." }, { status: 400 });
    }
    await sb("restaurant_tables", {
      method: "POST",
      body: JSON.stringify({
        project_id: PROJECT_ID,
        table_number: Number(table_number),
        seats: Number(seats),
      }),
    });
    return NextResponse.json({ ok: true, tables: await getTables() });
  } catch (e) {
    const msg = String(e).includes("duplicate")
      ? "Diese Tischnummer existiert bereits."
      : "Tisch konnte nicht angelegt werden.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });
  // Masaya bağlı rezervasyonların ataması kaldırılır, rezervasyon silinmez
  await sb(`reservations?table_id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ table_id: null }),
  });
  await sb(`restaurant_tables?id=eq.${id}&project_id=eq.${PROJECT_ID}`, { method: "DELETE" });
  return NextResponse.json({ ok: true, tables: await getTables() });
}
