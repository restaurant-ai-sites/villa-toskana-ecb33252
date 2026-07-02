import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "../../../../../lib/admin";
import { sb, PROJECT_ID } from "../../../../../lib/booking";

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await sb(
    `site_images?project_id=eq.${PROJECT_ID}&select=image_key,url,in_menu_gallery&order=created_at.asc`
  ).catch(() => []);
  return NextResponse.json({ images: rows || [] });
}

export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key erforderlich." }, { status: 400 });
  const { in_menu_gallery } = await request.json().catch(() => ({}));
  await sb(`site_images?project_id=eq.${PROJECT_ID}&image_key=eq.${key}`, {
    method: "PATCH",
    body: JSON.stringify({ in_menu_gallery: Boolean(in_menu_gallery) }),
  });
  return NextResponse.json({ ok: true });
}
