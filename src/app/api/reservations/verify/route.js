import { NextResponse } from "next/server";
import { checkSlot, sb, PROJECT_ID } from "../../../../lib/booking";
import { sendConfirmationEmail } from "../../../../lib/notify";
import siteData from "../../../../data/site-data.json";

const MAX_ATTEMPTS = 5;

export async function POST(request) {
  try {
    const { requestId, code } = await request.json();
    if (!requestId || !code) {
      return NextResponse.json({ error: "Code erforderlich." }, { status: 400 });
    }

    const rows = await sb(`verification_codes?id=eq.${requestId}&project_id=eq.${PROJECT_ID}`);
    const entry = rows?.[0];
    if (!entry) {
      return NextResponse.json({ error: "Anfrage nicht gefunden. Bitte starten Sie erneut." }, { status: 404 });
    }
    if (new Date(entry.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Der Code ist abgelaufen. Bitte fordern Sie einen neuen an." }, { status: 410 });
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "Zu viele Fehlversuche. Bitte starten Sie erneut." }, { status: 429 });
    }
    if (entry.code !== String(code).trim()) {
      await sb(`verification_codes?id=eq.${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ attempts: entry.attempts + 1 }),
      });
      return NextResponse.json({ error: "Falscher Code. Bitte versuchen Sie es erneut." }, { status: 401 });
    }

    // Yarış durumu: kod doğrulanırken slot dolmuş olabilir — tekrar kontrol
    const p = entry.payload;
    const check = await checkSlot(p.date, p.time, p.party);
    if (!check.ok) {
      await sb(`verification_codes?id=eq.${requestId}`, { method: "DELETE" });
      return NextResponse.json({ error: check.reason }, { status: 409 });
    }

    const inserted = await sb("reservations", {
      method: "POST",
      body: JSON.stringify({
        project_id: PROJECT_ID,
        guest_name: p.name,
        guest_email: p.email || null,
        guest_phone: p.phone || null,
        reservation_date: p.date,
        reservation_time: p.time,
        party_size: p.party,
        special_requests: p.requests || null,
        category: p.category || null,
        status: "confirmed",
        verified: true,
        table_id: check.table ? check.table.id : null,
      }),
    });

    await sb(`verification_codes?id=eq.${requestId}`, { method: "DELETE" });

    const confirmation = {
      id: inserted[0].id,
      date: p.date,
      time: p.time,
      party: p.party,
      name: p.name,
      tableNumber: check.table ? check.table.table_number : null,
    };

    // Müşteriye rezervasyon detaylarıyla onay e-postası (başarısızlık rezervasyonu bozmaz)
    if (p.email) {
      try {
        await sendConfirmationEmail(p.email, confirmation, siteData.restaurant);
      } catch (e) {
        console.error("confirmation email failed:", e);
      }
    }

    return NextResponse.json({ confirmed: true, reservation: confirmation });
  } catch (e) {
    console.error("verify error:", e);
    return NextResponse.json({ error: "Bestätigung fehlgeschlagen." }, { status: 500 });
  }
}
