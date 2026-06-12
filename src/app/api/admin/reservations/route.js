import { NextResponse } from "next/server";
import {
  sb, PROJECT_ID, getSettings, getTables, getReservations,
  getOpeningWindow, minutesOf, blockMinutes, findFreeTable,
} from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";

/** Gün görünümü: rezervasyonlar + masalar + saat saat doluluk */
export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const date = new URL(request.url).searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date erforderlich" }, { status: 400 });

  const [settings, tables, reservations] = await Promise.all([
    getSettings(), getTables(), getReservations(date),
  ]);

  // Saat saat doluluk: o saatte masada oturan toplam kişi
  // (rezervasyon başlangıcından ortalama yemek süresi boyunca)
  const win = getOpeningWindow(date);
  const hourly = [];
  if (win) {
    for (let h = Math.floor(win.open / 60); h <= Math.ceil(win.close / 60) - 1; h++) {
      const hourStart = h * 60;
      const seated = reservations
        .filter((r) => {
          const start = minutesOf(r.reservation_time.slice(0, 5));
          return start < hourStart + 60 && hourStart < start + settings.avg_dining_minutes;
        })
        .reduce((sum, r) => sum + (r.party_size || 0), 0);
      hourly.push({ hour: `${String(h).padStart(2, "0")}:00`, seated });
    }
  }

  return NextResponse.json({ settings, tables, reservations, hourly });
}

/** Masa değişikliği / iptal */
export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const { id, table_id, status } = await request.json();
    if (!id) return NextResponse.json({ error: "id erforderlich" }, { status: 400 });

    if (status === "cancelled") {
      await sb(`reservations?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      return NextResponse.json({ ok: true });
    }

    // Masa ataması değişikliği — çakışma kontrolüyle
    const rows = await sb(`reservations?id=eq.${id}&project_id=eq.${PROJECT_ID}`);
    const resv = rows?.[0];
    if (!resv) return NextResponse.json({ error: "Reservierung nicht gefunden." }, { status: 404 });

    if (table_id) {
      const settings = await getSettings();
      const dayReservations = await getReservations(resv.reservation_date);
      const start = minutesOf(resv.reservation_time.slice(0, 5));
      const block = blockMinutes(settings);

      const conflict = dayReservations
        .filter((r) => r.table_id === table_id && r.id !== id)
        .some((r) => Math.abs(minutesOf(r.reservation_time.slice(0, 5)) - start) < block);
      if (conflict) {
        return NextResponse.json(
          { error: "Dieser Tisch ist zu dieser Zeit bereits belegt." },
          { status: 409 }
        );
      }

      const tables = await getTables();
      const table = tables.find((t) => t.id === table_id);
      if (table && table.seats < resv.party_size) {
        return NextResponse.json(
          { error: `Tisch ${table.table_number} hat nur ${table.seats} Plätze.` },
          { status: 409 }
        );
      }
    }

    await sb(`reservations?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ table_id: table_id || null }),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin reservations error:", e);
    return NextResponse.json({ error: "Änderung fehlgeschlagen." }, { status: 500 });
  }
}
