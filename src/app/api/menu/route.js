import { NextResponse } from "next/server";
import { sb, PROJECT_ID } from "../../../lib/booking";

export async function GET() {
  try {
    const [galleryRows, sections] = await Promise.all([
      sb(`site_images?project_id=eq.${PROJECT_ID}&in_menu_gallery=eq.true&order=sort_order.asc,created_at.asc`).catch(() => []),
      sb(`menu_sections?project_id=eq.${PROJECT_ID}&is_active=eq.true&order=sort_order.asc,created_at.asc`).catch(() => []),
    ]);

    let items = [];
    if (sections?.length > 0) {
      const ids = sections.map((s) => s.id).join(",");
      items = await sb(
        `menu_items?project_id=eq.${PROJECT_ID}&is_active=eq.true&section_id=in.(${ids})&order=sort_order.asc,created_at.asc`
      ).catch(() => []);
    }

    const sectionsWithItems = (sections || []).map((s) => ({
      ...s,
      items: (items || []).filter((i) => i.section_id === s.id),
    }));

    return NextResponse.json({ gallery: galleryRows || [], sections: sectionsWithItems });
  } catch {
    return NextResponse.json({ gallery: [], sections: [] });
  }
}
