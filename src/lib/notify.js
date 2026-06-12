/** Doğrulama kodu gönderimi — e-posta (Resend) ve SMS (Twilio, anahtar girilince aktif). */

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

export async function sendVerificationEmail(to, code, restaurantName) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${restaurantName} <${process.env.RESEND_FROM_EMAIL}>`,
      to,
      subject: `Ihr Bestätigungscode: ${code}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>${restaurantName}</h2>
          <p>Ihr Bestätigungscode für die Tischreservierung lautet:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
          <p>Der Code ist 10 Minuten gültig.</p>
          <p style="color:#888;font-size:12px">Falls Sie keine Reservierung angefragt haben, ignorieren Sie diese E-Mail.</p>
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`E-Mail-Versand fehlgeschlagen: ${await res.text()}`);
}

export async function sendConfirmationEmail(to, reservation, restaurant) {
  const dateStr = new Date(`${reservation.date}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const tableLine = reservation.tableNumber ? `<p><strong>Tisch:</strong> ${reservation.tableNumber}</p>` : "";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${restaurant.name} <${process.env.RESEND_FROM_EMAIL}>`,
      to,
      subject: `Reservierungsbestätigung — ${dateStr}, ${reservation.time} Uhr`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2>${restaurant.name}</h2>
          <p>Liebe/r ${reservation.name},</p>
          <p>Ihre Reservierung ist bestätigt:</p>
          <p style="background:#f6f4ef;padding:16px 20px;border-radius:8px">
            <strong>Datum:</strong> ${dateStr}<br>
            <strong>Uhrzeit:</strong> ${reservation.time} Uhr<br>
            <strong>Personen:</strong> ${reservation.party}
          </p>
          ${tableLine}
          <p><strong>Adresse:</strong> ${restaurant.address || ""}<br>
          <strong>Telefon:</strong> ${restaurant.phone || ""}</p>
          <p>Falls Sie die Reservierung ändern oder stornieren möchten, rufen Sie uns bitte an.</p>
          <p>Wir freuen uns auf Ihren Besuch!</p>
        </div>`,
    }),
  });
  if (!res.ok) throw new Error(`Bestätigungs-E-Mail fehlgeschlagen: ${await res.text()}`);
}

export async function sendVerificationSms(to, code, restaurantName) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const body = new URLSearchParams({
    From: process.env.TWILIO_FROM_NUMBER,
    To: to,
    Body: `${restaurantName}: Ihr Bestätigungscode lautet ${code} (10 Min. gültig)`,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`SMS-Versand fehlgeschlagen: ${await res.text()}`);
}
