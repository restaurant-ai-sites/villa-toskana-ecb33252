import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "../../../../lib/admin";
import { sb, PROJECT_ID } from "../../../../lib/booking";
import { uploadToStorage as _upload } from "../../../../lib/storage";

async function uploadToStorage(path, file) {
  return _upload("site-images", path, file);
}

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await sb(`site_images?project_id=eq.${PROJECT_ID}&select=image_key,url`).catch(() => []);
  const images = {};
  (rows || []).forEach((r) => { images[r.image_key] = r.url; });
  return NextResponse.json({ images });
}

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  try {
    const formData = await request.formData();
    const imageKey = formData.get("key");
    const file = formData.get("file");
    if (!imageKey || !file) return NextResponse.json({ error: "key und file erforderlich." }, { status: 400 });

    const ext = file.name?.split(".").pop() || "jpg";
    const path = `${PROJECT_ID}/${imageKey}-${Date.now()}.${ext}`;
    const url = await uploadToStorage(path, file);

    await sb(`site_images`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ project_id: PROJECT_ID, image_key: imageKey, url, updated_at: new Date().toISOString() }),
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const imageKey = searchParams.get("key");
  if (!imageKey) return NextResponse.json({ error: "key erforderlich." }, { status: 400 });
  await sb(`site_images?project_id=eq.${PROJECT_ID}&image_key=eq.${imageKey}`, { method: "DELETE" });
  return NextResponse.json({ ok: true });
}
