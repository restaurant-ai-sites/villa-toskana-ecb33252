import { NextResponse } from "next/server";
import { isMasterAdmin, unauthorized } from "../../../../../lib/admin";
import { sb, PROJECT_ID } from "../../../../../lib/booking";

export async function POST(request) {
  if (!isMasterAdmin(request)) return unauthorized();

  const { image_url } = await request.json().catch(() => ({}));
  if (!image_url)
    return NextResponse.json({ error: "image_url erforderlich." }, { status: 400 });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY)
    return NextResponse.json({ error: "OpenAI nicht konfiguriert." }, { status: 503 });

  const prompt = `Das ist ein Foto einer Speisekarte. Extrahiere alle Gerichte als JSON:
{
  "sections": [
    {
      "name": "Abschnittsname (z.B. Vorspeisen, Hauptgerichte, Desserts, Getränke)",
      "items": [
        {
          "name": "Gerichtname",
          "description": "Beschreibung oder Zutaten (falls vorhanden, sonst leerer String)",
          "price": "Preis mit Symbol (z.B. 12,90 €) oder leerer String"
        }
      ]
    }
  ]
}
Nur JSON zurückgeben. Kein Text davor oder danach.`;

  const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image_url, detail: "high" } },
          ],
        },
      ],
    }),
  });

  if (!oaRes.ok) {
    const err = await oaRes.text();
    return NextResponse.json({ error: `OpenAI: ${err.slice(0, 300)}` }, { status: 502 });
  }

  const oaData = await oaRes.json();
  let parsed;
  try {
    const text = oaData.choices[0].message.content.trim();
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : text);
  } catch {
    return NextResponse.json({ error: "Menü konnte nicht analysiert werden." }, { status: 422 });
  }

  let sectionCount = 0;
  let itemCount = 0;
  for (let si = 0; si < (parsed.sections || []).length; si++) {
    const sec = parsed.sections[si];
    if (!sec.name) continue;
    const secRows = await sb("menu_sections", {
      method: "POST",
      body: JSON.stringify({
        project_id: PROJECT_ID,
        name: sec.name,
        sort_order: si,
        is_active: true,
      }),
    }).catch(() => null);
    const secId = secRows?.[0]?.id;
    if (!secId) continue;
    sectionCount++;

    for (let ii = 0; ii < (sec.items || []).length; ii++) {
      const item = sec.items[ii];
      if (!item.name) continue;
      await sb("menu_items", {
        method: "POST",
        body: JSON.stringify({
          project_id: PROJECT_ID,
          section_id: secId,
          name: item.name,
          description: item.description || "",
          price: item.price || "",
          sort_order: ii,
          is_active: true,
        }),
      }).catch(() => null);
      itemCount++;
    }
  }

  return NextResponse.json({ ok: true, sections: sectionCount, items: itemCount });
}
