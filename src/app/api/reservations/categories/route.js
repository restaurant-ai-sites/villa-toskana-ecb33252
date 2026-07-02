import { NextResponse } from "next/server";
import { sb, PROJECT_ID } from "../../../../lib/booking";

const DAY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  const rows = await sb(
    `reservation_categories?project_id=eq.${PROJECT_ID}&is_active=eq.true&order=sort_order.asc,created_at.asc`
  ).catch(() => []);

  if (!date || !rows?.length) {
    return NextResponse.json({ categories: rows || [] });
  }

  const dayCode = DAY_MAP[new Date(date + "T12:00:00").getDay()];

  const filtered = rows.filter((cat) => {
    const days = Array.isArray(cat.available_days) ? cat.available_days : ["all"];
    const holidays = Array.isArray(cat.holiday_dates) ? cat.holiday_dates : [];
    return days.includes("all") || days.includes(dayCode) || holidays.includes(date);
  });

  return NextResponse.json({ categories: filtered });
}
