/**
 * Rezervasyon kural motoru (sunucu tarafı — API route'larında çalışır).
 *
 * Kurallar:
 *  - Açılış saatleri içinde, kapanıştan en az ortalama yemek süresi önce başlamalı.
 *  - Son dakika engeli: rezervasyon, saatinden en az 0,75 × ort. süre önce yapılmalı.
 *  - Masa devri: aynı masaya/kapasiteye yeni rezervasyon, mevcut bir rezervasyonun
 *    başlangıcına 0,75 × ort. süre içinde başlayamaz (her iki yönde).
 *  - Masa modu açıksa: en küçük uygun masa otomatik atanır.
 */

import siteData from "../data/site-data.json";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SECRET_KEY;
export const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;

export async function sb(path, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const DEFAULT_SETTINGS = {
  total_capacity: 40,
  avg_dining_minutes: 90,
  use_tables: false,
  verification_method: "email",
  max_party_size: 10,
};

export async function getSettings() {
  const rows = await sb(`reservation_settings?project_id=eq.${PROJECT_ID}`);
  return rows?.[0] ? { ...DEFAULT_SETTINGS, ...rows[0] } : { ...DEFAULT_SETTINGS, project_id: PROJECT_ID };
}

export function blockMinutes(settings) {
  return Math.round(settings.avg_dining_minutes * 0.75);
}

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/** "11:30 – 22:00" → {open: 690, close: 1320}; "Ruhetag"/eksik → null */
export function getOpeningWindow(dateStr) {
  const day = DAY_NAMES[new Date(`${dateStr}T12:00:00`).getDay()];
  const hours = (siteData.restaurant.openingHours || {})[day];
  if (!hours) return null;
  const m = String(hours).match(/(\d{1,2})[:.](\d{2})\s*[–\-]\s*(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  return { open: +m[1] * 60 + +m[2], close: +m[3] * 60 + +m[4] };
}

export function minutesOf(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/** Berlin saatine göre slota kalan dakika (sunucu UTC'de çalışır) */
export function minutesUntilSlot(dateStr, timeStr) {
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const nowBerlin = fmt.format(new Date()).replace(" ", "T") + ":00Z";
  const slot = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
  return (slot - new Date(nowBerlin).getTime()) / 60000;
}

export async function getReservations(dateStr) {
  return (
    (await sb(
      `reservations?project_id=eq.${PROJECT_ID}&reservation_date=eq.${dateStr}&status=neq.cancelled&select=*`
    )) || []
  );
}

export async function getTables() {
  return (
    (await sb(`restaurant_tables?project_id=eq.${PROJECT_ID}&order=seats.asc,table_number.asc`)) || []
  );
}

/** Masa modunda en küçük uygun boş masayı bulur; yoksa null */
export function findFreeTable(tables, reservations, startMin, party, block, ignoreReservationId = null) {
  for (const table of tables.filter((t) => t.seats >= party)) {
    const conflict = reservations
      .filter((r) => r.table_id === table.id && r.id !== ignoreReservationId)
      .some((r) => Math.abs(minutesOf(r.reservation_time.slice(0, 5)) - startMin) < block);
    if (!conflict) return table;
  }
  return null;
}

/** Kapasite modunda yer var mı? (0,75d penceresi içinde başlayanların toplamı) */
export function capacityFree(reservations, startMin, party, settings) {
  const block = blockMinutes(settings);
  const used = reservations
    .filter((r) => Math.abs(minutesOf(r.reservation_time.slice(0, 5)) - startMin) < block)
    .reduce((sum, r) => sum + (r.party_size || 0), 0);
  return used + party <= settings.total_capacity;
}

/** Tek bir slotun rezerve edilebilirliğini kontrol eder */
export async function checkSlot(dateStr, timeStr, party) {
  const settings = await getSettings();

  if (!party || party < 1 || party > settings.max_party_size) {
    return { ok: false, reason: `Online maximal ${settings.max_party_size} Personen — für größere Gruppen rufen Sie uns bitte an.` };
  }

  const win = getOpeningWindow(dateStr);
  if (!win) return { ok: false, reason: "An diesem Tag haben wir geschlossen." };

  const start = minutesOf(timeStr);
  if (start < win.open || start > win.close - settings.avg_dining_minutes) {
    return { ok: false, reason: "Diese Uhrzeit liegt außerhalb der reservierbaren Zeiten." };
  }

  if (minutesUntilSlot(dateStr, timeStr) < blockMinutes(settings)) {
    return { ok: false, reason: "Für diese Uhrzeit ist eine Online-Reservierung nicht mehr möglich — rufen Sie uns gerne an." };
  }

  const reservations = await getReservations(dateStr);

  if (settings.use_tables) {
    const tables = await getTables();
    const table = findFreeTable(tables, reservations, start, party, blockMinutes(settings));
    if (!table) return { ok: false, reason: "Zu dieser Uhrzeit ist leider kein passender Tisch frei." };
    return { ok: true, settings, table };
  }

  if (!capacityFree(reservations, start, party, settings)) {
    return { ok: false, reason: "Zu dieser Uhrzeit sind wir leider ausgebucht." };
  }
  return { ok: true, settings, table: null };
}

/** Bir gün için müsait saatleri listeler (30 dk aralıklarla) */
export async function listSlots(dateStr, party) {
  const settings = await getSettings();
  const win = getOpeningWindow(dateStr);
  if (!win) return { closed: true, slots: [] };

  const reservations = await getReservations(dateStr);
  const tables = settings.use_tables ? await getTables() : null;
  const block = blockMinutes(settings);
  const slots = [];

  for (let t = win.open; t <= win.close - settings.avg_dining_minutes; t += 30) {
    const timeStr = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    if (minutesUntilSlot(dateStr, timeStr) < block) continue;

    const free = settings.use_tables
      ? !!findFreeTable(tables, reservations, t, party, block)
      : capacityFree(reservations, t, party, settings);
    if (free) slots.push(timeStr);
  }
  return { closed: false, slots };
}
