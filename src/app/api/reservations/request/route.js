import { NextResponse } from "next/server";
import { checkSlot, sb, PROJECT_ID } from "../../../../lib/booking";
import { sendVerificationEmail, sendVerificationSms, smsConfigured } from "../../../../lib/notify";
import siteData from "../../../../data/site-data.json";

const MAX_CODES_PER_HOUR = 3;

export async function POST(request) {
  try {
    const { date, time, party, name, email, phone, requests, category } = await request.json();

    if (!date || !time || !party || !name) {
      return NextResponse.json({ error: "Bitte füllen Sie alle Pflichtfelder aus." }, { status: 400 });
    }

    const check = await checkSlot(date, time, Number(party));
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 409 });
    }

    // Doğrulama kanalı: ayar SMS + Twilio aktif + telefon varsa SMS, aksi halde e-posta
    const useSms = check.settings.verification_method === "sms" && smsConfigured() && phone;
    const contact = useSms ? phone : email;
    if (!contact) {
      return NextResponse.json(
        { error: useSms ? "Bitte Telefonnummer angeben." : "Bitte E-Mail-Adresse angeben." },
        { status: 400 }
      );
    }

    // Hız limiti: aynı kişiye saatte en fazla 3 kod
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const recent = await sb(
      `verification_codes?project_id=eq.${PROJECT_ID}&contact=eq.${encodeURIComponent(contact)}&created_at=gte.${hourAgo}&select=id`
    );
    if ((recent || []).length >= MAX_CODES_PER_HOUR) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
        { status: 429 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const rows = await sb("verification_codes", {
      method: "POST",
      body: JSON.stringify({
        project_id: PROJECT_ID,
        contact,
        code,
        payload: { date, time, party: Number(party), name, email: email || "", phone: phone || "", requests: requests || "", category: category || null },
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    });

    const restaurantName = siteData.restaurant.name;
    if (useSms) {
      await sendVerificationSms(contact, code, restaurantName);
    } else {
      await sendVerificationEmail(contact, code, restaurantName);
    }

    const masked = useSms
      ? contact.replace(/.(?=.{3})/g, "•")
      : contact.replace(/^(.).*(@.*)$/, "$1•••$2");

    return NextResponse.json({
      requestId: rows[0].id,
      channel: useSms ? "sms" : "email",
      sentTo: masked,
    });
  } catch (e) {
    console.error("request error:", e);
    return NextResponse.json({ error: "Anfrage konnte nicht verarbeitet werden." }, { status: 500 });
  }
}
