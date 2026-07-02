import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "../../../../lib/admin";
import { sb, PROJECT_ID } from "../../../../lib/booking";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function uploadCategoryImage(categoryId, file) {
  const ext = file.name?.split(".").pop() || "jpg";
  const path = `${PROJECT_ID}/category-${categoryId}-${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const res = await fetch(`${SB_URL}/storage/v1/object/site-images/${path}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: arrayBuffer,
  });
  if (!res.ok) throw new Error(`Storage ${res.status}: ${await res.text()}`);
  return `${SB_URL}/storage/v1/object/public/site-images/${path}`;
}

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();
  const rows = await sb(
    `reservation_categories?project_id=eq.${PROJECT_ID}&order=sort_order.asc,created_at.asc`
  ).catch(() => []);
  return NextResponse.json({ categories: rows || [] });
}

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Image upload for existing category
    try {
      const formData = await request.formData();
      const id = formData.get("id");
      const file = formData.get("file");
      if (!id || !file) return NextResponse.json({ error: "id und file erforderlich." }, { status: 400 });
      const url = await uploadCategoryImage(id, file);
      await sb(`reservation_categories?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ image_url: url }),
      });
      return NextResponse.json({ ok: true, url });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Create new category
  try {
    const { name, description, sort_order } = await request.json();
    if (!name) return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
    const rows = await sb("reservation_categories", {
      method: "POST",
      body: JSON.stringify({
        project_id: PROJECT_ID,
        name,
        description: description || "",
        sort_order: sort_order ?? 0,
        is_active: true,
        image_url: "",
      }),
    });
    return NextResponse.json({ ok: true, category: rows?.[0] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich." }, { status: 400 });
  const body = await request.json();
  const allowed = ["name", "description", "image_url", "sort_order", "is_active", "available_days", "holiday_dates"];
  const update = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  await sb(`reservation_categories?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id erforderlich." }, { status: 400 });
  await sb(`reservation_categories?id=eq.${id}&project_id=eq.${PROJECT_ID}`, { method: "DELETE" });
  return NextResponse.json({ ok: true });
}
