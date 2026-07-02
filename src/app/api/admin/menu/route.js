import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "../../../../lib/admin";
import { sb, PROJECT_ID } from "../../../../lib/booking";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const getSbKey = () => process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request) {
  if (!isAdmin(request)) return unauthorized();

  const sections = await sb(
    `menu_sections?project_id=eq.${PROJECT_ID}&order=sort_order.asc,created_at.asc`
  ).catch(() => []);

  let items = [];
  if (sections?.length > 0) {
    const ids = sections.map((s) => s.id).join(",");
    items = await sb(
      `menu_items?project_id=eq.${PROJECT_ID}&section_id=in.(${ids})&order=sort_order.asc,created_at.asc`
    ).catch(() => []);
  }

  const sectionsWithItems = (sections || []).map((s) => ({
    ...s,
    items: (items || []).filter((i) => i.section_id === s.id),
  }));

  return NextResponse.json({ sections: sectionsWithItems });
}

export async function POST(request) {
  if (!isAdmin(request)) return unauthorized();

  const contentType = request.headers.get("content-type") || "";

  // Image upload for a menu item
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const itemId = formData.get("item_id");
      const file = formData.get("file");
      if (!itemId || !file)
        return NextResponse.json({ error: "item_id und file erforderlich." }, { status: 400 });

      const SB_KEY = getSbKey();
      const ext = file.name?.split(".").pop() || "jpg";
      const path = `${PROJECT_ID}/menu-${itemId}-${Date.now()}.${ext}`;
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
      const url = `${SB_URL}/storage/v1/object/public/site-images/${path}`;
      await sb(`menu_items?id=eq.${itemId}&project_id=eq.${PROJECT_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ image_url: url }),
      });
      return NextResponse.json({ ok: true, url });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Create section or item
  const body = await request.json().catch(() => ({}));

  if (body.type === "section") {
    try {
      const rows = await sb("menu_sections", {
        method: "POST",
        body: JSON.stringify({
          project_id: PROJECT_ID,
          name: body.name,
          sort_order: body.sort_order ?? 0,
          is_active: true,
        }),
      });
      return NextResponse.json({ ok: true, section: rows?.[0] });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  if (body.type === "item") {
    try {
      const rows = await sb("menu_items", {
        method: "POST",
        body: JSON.stringify({
          project_id: PROJECT_ID,
          section_id: body.section_id,
          name: body.name,
          description: body.description || "",
          price: body.price || "",
          sort_order: body.sort_order ?? 0,
          is_active: true,
        }),
      });
      return NextResponse.json({ ok: true, item: rows?.[0] });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "type erforderlich (section|item)" }, { status: 400 });
}

export async function PATCH(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  if (!id || !type)
    return NextResponse.json({ error: "id und type erforderlich." }, { status: 400 });

  const body = await request.json().catch(() => ({}));

  if (type === "section") {
    const allowed = ["name", "sort_order", "is_active"];
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    await sb(`menu_sections?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    });
  } else if (type === "item") {
    const allowed = ["name", "description", "price", "image_url", "sort_order", "is_active"];
    const update = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
    await sb(`menu_items?id=eq.${id}&project_id=eq.${PROJECT_ID}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  if (!isAdmin(request)) return unauthorized();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  if (!id || !type)
    return NextResponse.json({ error: "id und type erforderlich." }, { status: 400 });

  const table = type === "section" ? "menu_sections" : "menu_items";
  await sb(`${table}?id=eq.${id}&project_id=eq.${PROJECT_ID}`, { method: "DELETE" });
  return NextResponse.json({ ok: true });
}
