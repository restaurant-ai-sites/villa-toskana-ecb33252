import { NextResponse } from "next/server";
import { listSlots } from "../../../../lib/booking";

export async function POST(request) {
  try {
    const { date, party } = await request.json();
    if (!date || !party) {
      return NextResponse.json({ error: "Datum und Personenzahl erforderlich." }, { status: 400 });
    }
    const result = await listSlots(date, Number(party));
    return NextResponse.json(result);
  } catch (e) {
    console.error("availability error:", e);
    return NextResponse.json({ error: "Verfügbarkeit konnte nicht geprüft werden." }, { status: 500 });
  }
}
