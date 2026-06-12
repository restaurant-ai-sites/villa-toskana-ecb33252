import { NextResponse } from "next/server";
import { sb, PROJECT_ID, getSettings } from "../../../../lib/booking";
import { isAdmin, unauthorized } from "../../../../lib/admin";
import { smsConfigured } from "../../../../lib/notify";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const settings = await getSettings();
  return NextResponse.json({ settings, smsAvailable: smsConfigured() });
}

export async function PUT(request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const body = await request.json();
    const settings = {
      project_id: PROJECT_ID,
      total_capacity: Math.max(1, Number(body.total_capacity) || 40),
      avg_dining_minutes: Math.max(30, Number(body.avg_dining_minutes) || 90),
      use_tables: Boolean(body.use_tables),
      verification_method: body.verification_method === "sms" ? "sms" : "email",
      max_party_size: Math.max(1, Number(body.max_party_size) || 10),
      updated_at: new Date().toISOString(),
    };
    await sb("reservation_settings", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(settings),
    });
    return NextResponse.json({ ok: true, settings });
  } catch (e) {
    console.error("settings error:", e);
    return NextResponse.json({ error: "Einstellungen konnten nicht gespeichert werden." }, { status: 500 });
  }
}
