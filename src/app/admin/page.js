"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const inputCls =
  "w-full border border-coffee/20 bg-cream px-3 py-2 text-coffee outline-none focus:border-terra";
const btnCls =
  "bg-terra px-5 py-2.5 text-sm text-cream transition-colors hover:bg-terradark disabled:opacity-40";

function api(path, key, init = {}) {
  return fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-admin-key": key, ...(init.headers || {}) },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Fehler");
    return data;
  });
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [tab, setTab] = useState("reservierungen");
  const [error, setError] = useState("");

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/admin/settings", adminKey);
      setIsMaster(data.isMasterAdmin || false);
      sessionStorage.setItem("adminKey", adminKey);
      setAuthed(true);
    } catch {
      setError("Falsches Passwort.");
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("adminKey");
    if (saved) {
      api("/api/admin/settings", saved)
        .then((data) => { setAdminKey(saved); setIsMaster(data.isMasterAdmin || false); setAuthed(true); })
        .catch(() => sessionStorage.removeItem("adminKey"));
    }
  }, []);

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24">
        <h1 className="text-center font-display text-3xl font-semibold">Admin-Bereich</h1>
        <form onSubmit={login} className="mt-8 space-y-4">
          <input
            type="password" placeholder="Admin-Passwort" value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)} className={inputCls} autoFocus
          />
          {error && <p className="text-center text-sm text-red-700">{error}</p>}
          <button className={`${btnCls} w-full`}>Anmelden</button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Admin-Bereich</h1>
      <div className="mt-6 flex gap-2 border-b border-coffee/15">
        {[
          ["reservierungen", "📋 Reservierungen"],
          ["einstellungen", "⚙️ Einstellungen"],
          ["tische", "🪑 Tische"],
          ["kategorien", "🏷 Kategorien"],
          ["speisekarte", "🍽 Speisekarte"],
          ["bilder", "🖼 Bilder"],
          ["support", "💬 Support"],
        ].map(([id, label]) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm ${tab === id ? "border-b-2 border-terra font-semibold" : "text-coffee/60"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "einstellungen" && <SettingsTab adminKey={adminKey} />}
      {tab === "tische" && <TablesTab adminKey={adminKey} />}
      {tab === "reservierungen" && <ReservationsTab adminKey={adminKey} />}
      {tab === "kategorien" && <KategorienTab adminKey={adminKey} />}
      {tab === "speisekarte" && <SpeisenkarteTab adminKey={adminKey} isMasterAdmin={isMaster} />}
      {tab === "bilder" && <BilderTab adminKey={adminKey} />}
      {tab === "support" && <SupportTab adminKey={adminKey} />}
    </main>
  );
}

const IMAGE_SLOTS = [
  { key: "hero", label: "Hero (Kapak Fotoğrafı)" },
  { key: "about", label: "Hakkımızda Görseli" },
  { key: "speisekarte", label: "Speisekarte Görseli" },
  { key: "gallery_1", label: "Galeri 1" },
  { key: "gallery_2", label: "Galeri 2" },
  { key: "gallery_3", label: "Galeri 3" },
  { key: "gallery_4", label: "Galeri 4" },
  { key: "gallery_5", label: "Galeri 5" },
];

function BilderTab({ adminKey }) {
  const [images, setImages] = useState({});
  const [foodPhotos, setFoodPhotos] = useState([]);
  const [uploading, setUploading] = useState({});
  const [foodUploading, setFoodUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const foodFileRef = useRef(null);

  function reloadAll() {
    api("/api/admin/images", adminKey).then((d) => {
      const imgs = d.images || {};
      setImages(imgs);
      setFoodPhotos(
        Object.entries(imgs)
          .filter(([k]) => k.startsWith("food_"))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, url]) => ({ key: k, url }))
      );
    });
  }

  useEffect(() => { reloadAll(); }, [adminKey]);

  async function upload(slotKey, file) {
    setUploading((p) => ({ ...p, [slotKey]: true }));
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("key", slotKey);
      fd.append("file", file);
      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImages((p) => ({ ...p, [slotKey]: data.url }));
      setMsg("✓ Hochgeladen!");
    } catch (e) {
      setMsg("Fehler: " + e.message);
    } finally {
      setUploading((p) => ({ ...p, [slotKey]: false }));
    }
  }

  async function remove(slotKey) {
    if (!confirm("Dieses Bild entfernen?")) return;
    await fetch(`/api/admin/images?key=${slotKey}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    setImages((p) => { const n = { ...p }; delete n[slotKey]; return n; });
    setFoodPhotos((p) => p.filter((f) => f.key !== slotKey));
  }

  async function uploadFoodPhoto(file) {
    setFoodUploading(true);
    setMsg("");
    try {
      const key = `food_${Date.now()}`;
      const fd = new FormData();
      fd.append("key", key);
      fd.append("file", file);
      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Auto-mark as in_menu_gallery
      await fetch(`/api/admin/menu/gallery?key=${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ in_menu_gallery: true }),
      });
      setFoodPhotos((p) => [...p, { key, url: data.url }]);
      setMsg("✓ Foto hinzugefügt und in Speisekarte-Galerie gespeichert!");
    } catch (e) {
      setMsg("Fehler: " + e.message);
    } finally {
      setFoodUploading(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">{msg}</p>}

      {/* Fixed image slots */}
      <div className="space-y-4">
        {IMAGE_SLOTS.map(({ key, label }) => (
          <ImageSlot key={key} slotKey={key} label={label} url={images[key]}
            uploading={!!uploading[key]} onUpload={(f) => upload(key, f)} onRemove={() => remove(key)} />
        ))}
      </div>

      {/* Food / menu gallery photos */}
      <div className="border-t border-coffee/10 pt-6">
        <p className="text-sm font-medium text-coffee mb-1">📸 Foodfotos (Speisekarte-Galerie)</p>
        <p className="text-xs text-coffee/50 mb-4">
          Diese Fotos erscheinen in der Galerie auf der Speisekarte-Seite. Auswahl & Reihenfolge
          können im Tab „🍽 Speisekarte" angepasst werden.
        </p>

        {foodPhotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {foodPhotos.map((f) => (
              <div key={f.key} className="relative group">
                <img src={f.url} alt={f.key}
                  className="w-full aspect-square object-cover rounded border border-coffee/10" />
                <button
                  onClick={() => remove(f.key)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs items-center justify-center hidden group-hover:flex font-bold"
                  title="Löschen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => foodFileRef.current?.click()}
          disabled={foodUploading}
          className="w-full border-2 border-dashed border-coffee/20 py-6 text-sm text-coffee/50 hover:border-terra hover:text-terra rounded transition"
        >
          {foodUploading ? "Lädt hoch…" : "📁 Neues Foodfoto hinzufügen"}
        </button>
        <input ref={foodFileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFoodPhoto(f); e.target.value = ""; }} />
      </div>
    </div>
  );
}

function ImageSlot({ slotKey, label, url, uploading, onUpload, onRemove }) {
  const fileRef = useRef(null);
  return (
    <div className="border border-coffee/15 rounded p-4">
      <p className="text-sm font-medium text-coffee mb-3">{label}</p>
      {url ? (
        <div className="flex items-start gap-3">
          <img src={url} alt={slotKey} className="h-24 w-36 object-cover rounded border border-coffee/10" />
          <div className="flex flex-col gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="bg-terra px-4 py-1.5 text-sm text-cream hover:bg-terradark disabled:opacity-40 rounded">
              {uploading ? "…" : "Ersetzen"}
            </button>
            <button onClick={onRemove} className="text-xs text-red-600 hover:underline">Entfernen</button>
          </div>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-coffee/20 py-8 text-sm text-coffee/50 hover:border-terra hover:text-terra rounded transition">
          {uploading ? "Lädt hoch…" : "📁 Bild hochladen"}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
    </div>
  );
}

function SupportTab({ adminKey }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/admin/support", adminKey)
      .then((d) => setMessages(d.messages || []))
      .finally(() => setLoading(false));
  }, [adminKey]);

  async function markRead(id) {
    await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ id, status: "read" }),
    });
    setMessages((p) => p.map((m) => m.id === id ? { ...m, status: "read" } : m));
  }

  if (loading) return <p className="mt-8 text-coffee/50 text-sm">Lädt…</p>;
  if (messages.length === 0) {
    return <div className="mt-8 text-center py-12 text-coffee/40"><p className="text-3xl mb-2">📭</p><p className="text-sm">Noch keine Nachrichten</p></div>;
  }

  return (
    <div className="mt-8 space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={`border rounded p-4 ${m.status === "new" ? "border-terra/40 bg-terra/5" : "border-coffee/10"}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm text-coffee">{m.name} {m.email ? `(${m.email})` : ""}</p>
              <p className="text-xs text-coffee/50 mt-0.5">{new Date(m.created_at).toLocaleString("de-DE")}</p>
            </div>
            {m.status === "new" && (
              <button onClick={() => markRead(m.id)}
                className="text-xs px-2 py-1 border border-coffee/20 rounded hover:bg-coffee/5 shrink-0">
                Als gelesen markieren
              </button>
            )}
          </div>
          <p className="text-sm text-coffee mt-3 whitespace-pre-wrap">{m.message}</p>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ adminKey }) {
  const [s, setS] = useState(null);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/admin/settings", adminKey).then((d) => {
      setS(d.settings);
      setSmsAvailable(d.smsAvailable);
    });
  }, [adminKey]);

  if (!s) return <p className="mt-8 text-coffee/60">Lädt…</p>;

  async function save(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/admin/settings", adminKey, { method: "PUT", body: JSON.stringify(s) });
      setMsg("✓ Gespeichert");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <form onSubmit={save} className="mt-8 max-w-md space-y-5">
      <label className="block">
        <span className="mb-1 block text-sm text-coffee/70">Gesamtkapazität (Personen)</span>
        <input type="number" min="1" value={s.total_capacity} className={inputCls}
          onChange={(e) => setS({ ...s, total_capacity: e.target.value })} />
        <span className="text-xs text-coffee/50">Wird verwendet, wenn der Tisch-Modus aus ist.</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-coffee/70">Durchschnittliche Essensdauer (Minuten)</span>
        <input type="number" min="30" step="5" value={s.avg_dining_minutes} className={inputCls}
          onChange={(e) => setS({ ...s, avg_dining_minutes: e.target.value })} />
        <span className="text-xs text-coffee/50">
          Vorlaufzeit & Tischwechsel: {Math.round((s.avg_dining_minutes || 90) * 0.75)} Min. (0,75 ×)
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-coffee/70">Max. Personen pro Online-Reservierung</span>
        <input type="number" min="1" value={s.max_party_size} className={inputCls}
          onChange={(e) => setS({ ...s, max_party_size: e.target.value })} />
      </label>
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={s.use_tables}
          onChange={(e) => setS({ ...s, use_tables: e.target.checked })} />
        <span className="text-sm">
          Tisch-Modus: Reservierungen werden automatisch Tischen zugeordnet
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-coffee/70">Bestätigungsmethode</span>
        <select value={s.verification_method} className={inputCls}
          onChange={(e) => setS({ ...s, verification_method: e.target.value })}>
          <option value="email">E-Mail-Code</option>
          <option value="sms" disabled={!smsAvailable}>
            SMS-Code {smsAvailable ? "" : "(noch nicht eingerichtet)"}
          </option>
        </select>
      </label>
      <div className="flex items-center gap-4">
        <button className={btnCls}>Speichern</button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </form>
  );
}

function TablesTab({ adminKey }) {
  const [tables, setTables] = useState([]);
  const [num, setNum] = useState("");
  const [seats, setSeats] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(
    () => api("/api/admin/tables", adminKey).then((d) => setTables(d.tables)),
    [adminKey]
  );
  useEffect(() => { load(); }, [load]);

  async function addTable(e) {
    e.preventDefault();
    setMsg("");
    try {
      const d = await api("/api/admin/tables", adminKey, {
        method: "POST",
        body: JSON.stringify({ table_number: num, seats }),
      });
      setTables(d.tables);
      setNum(""); setSeats("");
    } catch (err) { setMsg(err.message); }
  }

  async function removeTable(id) {
    const d = await api(`/api/admin/tables?id=${id}`, adminKey, { method: "DELETE" });
    setTables(d.tables);
  }

  return (
    <div className="mt-8 max-w-md">
      <form onSubmit={addTable} className="flex gap-2">
        <input type="number" min="1" placeholder="Tisch-Nr." value={num}
          onChange={(e) => setNum(e.target.value)} className={inputCls} required />
        <input type="number" min="1" placeholder="Plätze" value={seats}
          onChange={(e) => setSeats(e.target.value)} className={inputCls} required />
        <button className={btnCls}>+</button>
      </form>
      {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
      <ul className="mt-6 divide-y divide-coffee/10">
        {tables.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-3">
            <span>Tisch {t.table_number} — {t.seats} Plätze</span>
            <button onClick={() => removeTable(t.id)} className="text-sm text-red-700 hover:underline">
              Löschen
            </button>
          </li>
        ))}
        {tables.length === 0 && <li className="py-3 text-sm text-coffee/50">Noch keine Tische angelegt.</li>}
      </ul>
    </div>
  );
}

const DAY_CODES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = { mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa", sun: "So" };

function detectMode(days) {
  if (!days || days.includes("all")) return "all";
  const d = days.slice().sort().join(",");
  if (d === "fri,mon,thu,tue,wed") return "weekdays";
  if (d === "sat,sun") return "weekends";
  return "custom";
}

function ScheduleSection({ cat, adminKey, onSaved }) {
  const [mode, setMode] = useState(() => detectMode(cat.available_days));
  const [customDays, setCustomDays] = useState(cat.available_days || []);
  const [holidays, setHolidays] = useState(cat.holiday_dates || []);
  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function getDays() {
    if (mode === "all") return ["all"];
    if (mode === "weekdays") return ["mon", "tue", "wed", "thu", "fri"];
    if (mode === "weekends") return ["sat", "sun"];
    return customDays.length > 0 ? customDays : ["all"];
  }

  function toggleCustomDay(d) {
    setCustomDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);
  }

  function addHoliday() {
    if (newDate && !holidays.includes(newDate)) {
      setHolidays((p) => [...p, newDate].sort());
      setNewDate("");
    }
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const days = getDays();
      await fetch(`/api/admin/categories?id=${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ available_days: days, holiday_dates: holidays }),
      });
      onSaved(cat.id, { available_days: days, holiday_dates: holidays });
      setMsg("✓ Gespeichert");
    } catch (e) {
      setMsg("Fehler: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const presets = [
    { id: "all", label: "Alle Tage" },
    { id: "weekdays", label: "Mo – Fr" },
    { id: "weekends", label: "Sa – So" },
    { id: "custom", label: "Benutzerdefiniert" },
  ];

  return (
    <div className="mt-4 border-t border-coffee/10 pt-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-coffee/50">Verfügbarkeit</p>

      {/* Ön ayarlar */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p.id} onClick={() => setMode(p.id)}
            className={`text-xs px-3 py-1 rounded-full border transition ${
              mode === p.id ? "border-terra bg-terra/10 text-terra" : "border-coffee/20 text-coffee/60 hover:border-coffee/40"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Özel gün seçimi */}
      {mode === "custom" && (
        <div className="flex flex-wrap gap-2">
          {DAY_CODES.map((d) => (
            <button key={d} onClick={() => toggleCustomDay(d)}
              className={`w-10 h-10 text-xs rounded-full border transition ${
                customDays.includes(d) ? "border-terra bg-terra text-cream" : "border-coffee/20 text-coffee/60 hover:border-coffee/40"
              }`}>
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
      )}

      {/* Özel tarihler (tatil günleri) */}
      <div>
        <p className="text-xs text-coffee/60 mb-2">Feiertage &amp; besondere Daten</p>
        <div className="flex gap-2">
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
            className="border border-coffee/20 bg-cream px-2 py-1.5 text-xs flex-1 outline-none focus:border-terra" />
          <button onClick={addHoliday} disabled={!newDate}
            className="px-3 py-1.5 text-xs bg-terra text-cream hover:bg-terradark disabled:opacity-40">
            + Hinzufügen
          </button>
        </div>
        {holidays.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {holidays.map((d) => (
              <span key={d} className="flex items-center gap-1 text-xs bg-coffee/8 border border-coffee/15 px-2 py-0.5 rounded-full">
                {new Date(d + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                <button onClick={() => setHolidays((p) => p.filter((x) => x !== d))}
                  className="text-red-400 hover:text-red-600 ml-0.5 font-bold">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="text-xs px-4 py-2 bg-terra text-cream hover:bg-terradark disabled:opacity-40">
          {saving ? "…" : "Speichern"}
        </button>
        {msg && <span className="text-xs text-green-700">{msg}</span>}
      </div>
    </div>
  );
}

function KategorienTab({ adminKey }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const fileRefs = useRef({});

  const load = useCallback(
    () =>
      api("/api/admin/categories", adminKey)
        .then((d) => setCats(d.categories || []))
        .finally(() => setLoading(false)),
    [adminKey]
  );
  useEffect(() => { load(); }, [load]);

  async function addCategory(e) {
    e.preventDefault();
    setMsg("");
    setAdding(true);
    try {
      await api("/api/admin/categories", adminKey, {
        method: "POST",
        body: JSON.stringify({ name: newName, description: newDesc, sort_order: cats.length }),
      });
      setNewName(""); setNewDesc("");
      await load();
    } catch (err) { setMsg(err.message); }
    finally { setAdding(false); }
  }

  async function uploadImage(cat, file) {
    setMsg("");
    const fd = new FormData();
    fd.append("id", cat.id);
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setCats((p) => p.map((c) => c.id === cat.id ? { ...c, image_url: d.url } : c));
      setMsg("✓ Bild hochgeladen!");
    } catch (e) { setMsg("Fehler: " + e.message); }
  }

  async function toggle(cat) {
    await fetch(`/api/admin/categories?id=${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ is_active: !cat.is_active }),
    });
    setCats((p) => p.map((c) => c.id === cat.id ? { ...c, is_active: !c.is_active } : c));
  }

  async function remove(id) {
    if (!confirm("Diese Kategorie löschen?")) return;
    await fetch(`/api/admin/categories?id=${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    setCats((p) => p.filter((c) => c.id !== id));
  }

  async function saveOrder(id, dir) {
    const idx = cats.findIndex((c) => c.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cats.length) return;
    const next = [...cats];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setCats(next);
    await Promise.all([
      fetch(`/api/admin/categories?id=${next[idx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ sort_order: idx }),
      }),
      fetch(`/api/admin/categories?id=${next[newIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ sort_order: newIdx }),
      }),
    ]);
  }

  function scheduleLabel(cat) {
    const days = cat.available_days || ["all"];
    const holidays = cat.holiday_dates || [];
    const mode = detectMode(days);
    const base = mode === "all" ? "Alle Tage" : mode === "weekdays" ? "Mo–Fr" : mode === "weekends" ? "Sa–So"
      : days.map((d) => DAY_LABELS[d] || d).join(", ");
    return holidays.length > 0 ? `${base} + ${holidays.length} Feiertag(e)` : base;
  }

  if (loading) return <p className="mt-8 text-coffee/50 text-sm">Lädt…</p>;

  return (
    <div className="mt-8 space-y-6">
      {msg && (
        <p className="text-sm px-3 py-2 border rounded bg-green-50 border-green-200 text-green-700">{msg}</p>
      )}
      <p className="text-sm text-coffee/60">
        Buchungskategorien ermöglichen es Gästen, beim Reservieren eine Art der Veranstaltung zu wählen
        (z. B. Frühstück, Grillabend, Abendessen). Die Kategorie wird der Reservierung beigefügt.
      </p>

      <div className="space-y-3">
        {cats.map((cat, idx) => (
          <div key={cat.id} className={`border rounded-lg p-4 ${cat.is_active ? "border-coffee/15" : "border-coffee/10 opacity-60"}`}>
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {cat.image_url ? (
                  <div className="relative group">
                    <img src={cat.image_url} alt={cat.name}
                      className="h-20 w-28 object-cover rounded border border-coffee/10" />
                    <button onClick={() => fileRefs.current[cat.id]?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition">
                      Ersetzen
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRefs.current[cat.id]?.click()}
                    className="h-20 w-28 border-2 border-dashed border-coffee/20 rounded flex flex-col items-center justify-center text-coffee/40 hover:border-terra hover:text-terra transition text-xs gap-1">
                    <span className="text-2xl">📷</span>
                    <span>Foto hinzufügen</span>
                  </button>
                )}
                <input type="file" accept="image/*" className="hidden"
                  ref={(el) => { fileRefs.current[cat.id] = el; }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(cat, f); e.target.value = ""; }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-coffee">{cat.name}</p>
                {cat.description && (
                  <p className="text-sm text-coffee/60 mt-0.5 truncate">{cat.description}</p>
                )}
                <p className="text-xs text-coffee/40 mt-1">📅 {scheduleLabel(cat)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={() => toggle(cat)}
                    className={`text-xs px-2.5 py-1 rounded border transition ${
                      cat.is_active ? "border-green-300 bg-green-50 text-green-700" : "border-coffee/20 text-coffee/50"
                    }`}>
                    {cat.is_active ? "✓ Aktiv" : "Inaktiv"}
                  </button>
                  <button
                    onClick={() => setExpandedSchedule(expandedSchedule === cat.id ? null : cat.id)}
                    className={`text-xs px-2.5 py-1 rounded border transition ${
                      expandedSchedule === cat.id ? "border-terra bg-terra/10 text-terra" : "border-coffee/20 text-coffee/60 hover:border-coffee/40"
                    }`}>
                    📅 Verfügbarkeit
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => saveOrder(cat.id, -1)} disabled={idx === 0}
                      className="px-2 py-1 border border-coffee/15 rounded text-xs hover:bg-coffee/5 disabled:opacity-30">▲</button>
                    <button onClick={() => saveOrder(cat.id, 1)} disabled={idx === cats.length - 1}
                      className="px-2 py-1 border border-coffee/15 rounded text-xs hover:bg-coffee/5 disabled:opacity-30">▼</button>
                  </div>
                  <button onClick={() => remove(cat.id)} className="text-xs text-red-600 hover:underline ml-auto">
                    Löschen
                  </button>
                </div>
                {expandedSchedule === cat.id && (
                  <ScheduleSection
                    cat={cat}
                    adminKey={adminKey}
                    onSaved={(id, data) => setCats((p) => p.map((c) => c.id === id ? { ...c, ...data } : c))}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
        {cats.length === 0 && (
          <div className="border border-dashed border-coffee/15 rounded-lg py-10 text-center text-coffee/40">
            <p className="text-3xl mb-2">🏷</p>
            <p className="text-sm">Noch keine Kategorien angelegt.</p>
          </div>
        )}
      </div>

      <div className="border-t border-coffee/10 pt-6">
        <h3 className="text-sm font-semibold text-coffee mb-4">Neue Kategorie hinzufügen</h3>
        <form onSubmit={addCategory} className="space-y-3 max-w-md">
          <input
            required value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (z. B. Frühstück, Grillabend, Abendessen…)"
            className={inputCls}
          />
          <input
            value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Kurzbeschreibung (optional)"
            className={inputCls}
          />
          <button disabled={adding} className={btnCls}>
            {adding ? "…" : "+ Kategorie hinzufügen"}
          </button>
        </form>
      </div>
    </div>
  );
}

const emptyManualForm = { name: "", phone: "", time: "", party: "2", requests: "", category: "" };

function ReservationsTab({ adminKey }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState(emptyManualForm);
  const [manualSaving, setManualSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  const load = useCallback(
    () => api(`/api/admin/reservations?date=${date}`, adminKey).then(setData).catch((e) => setMsg(e.message)),
    [adminKey, date]
  );
  useEffect(() => { load(); }, [load]);

  // Seçili tarihte geçerli kategorileri çek (yoksa dropdown gizlenir)
  useEffect(() => {
    fetch(`/api/reservations/categories?date=${date}`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => setCategories([]));
  }, [date]);

  async function addManual(e) {
    e.preventDefault();
    if (!manual.name.trim() || !manual.time) return;
    setManualSaving(true);
    setMsg("");
    try {
      const d = await api("/api/admin/reservations", adminKey, {
        method: "POST",
        body: JSON.stringify({
          name: manual.name.trim(),
          phone: manual.phone.trim(),
          date,
          time: manual.time,
          party: Number(manual.party) || 1,
          requests: manual.requests.trim(),
          category: manual.category || null,
        }),
      });
      setMsg(d.table_assigned ? "✓ Reservierung angelegt — Tisch automatisch zugeordnet." : "✓ Reservierung angelegt.");
      setManual(emptyManualForm);
      setShowManual(false);
      load();
    } catch (err) {
      setMsg(`⚠️ ${err.message}`);
    } finally {
      setManualSaving(false);
    }
  }

  async function changeTable(id, table_id) {
    setMsg("");
    try {
      await api("/api/admin/reservations", adminKey, {
        method: "PATCH",
        body: JSON.stringify({ id, table_id: table_id || null }),
      });
      load();
    } catch (err) { setMsg(`⚠️ ${err.message}`); }
  }

  async function cancel(id) {
    if (!confirm("Reservierung stornieren?")) return;
    await api("/api/admin/reservations", adminKey, {
      method: "PATCH",
      body: JSON.stringify({ id, status: "cancelled" }),
    });
    load();
  }

  async function autoAssign() {
    setMsg("");
    try {
      const d = await api("/api/admin/reservations", adminKey, {
        method: "PUT",
        body: JSON.stringify({ date }),
      });
      setMsg(`✓ ${d.assigned} Tisch(e) zugeordnet${d.failed ? `, ${d.failed} ohne passenden Tisch` : ""}`);
      load();
    } catch (err) { setMsg(`⚠️ ${err.message}`); }
  }

  const maxSeated = data ? Math.max(1, ...data.hourly.map((h) => h.seated)) : 1;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className={`${inputCls} max-w-xs`} />
        <button onClick={() => setShowManual((p) => !p)} className={btnCls}>
          📞 Manuelle Reservierung
        </button>
        {data?.settings?.use_tables && (
          <button onClick={autoAssign} className={btnCls}>
            🪑 Tische automatisch zuordnen
          </button>
        )}
      </div>

      {showManual && (
        <form onSubmit={addManual} className="mt-4 border border-coffee/15 bg-sand/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-coffee">
            Telefonische Reservierung für {new Date(`${date}T12:00:00`).toLocaleDateString("de-DE")} eintragen
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="text" placeholder="Name *" value={manual.name}
              onChange={(e) => setManual((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
            <input type="tel" placeholder="Telefon (optional)" value={manual.phone}
              onChange={(e) => setManual((p) => ({ ...p, phone: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="time" value={manual.time} required
              onChange={(e) => setManual((p) => ({ ...p, time: e.target.value }))} className={inputCls} />
            <input type="number" min="1" max="50" placeholder="Personen *" value={manual.party}
              onChange={(e) => setManual((p) => ({ ...p, party: e.target.value }))} className={inputCls} />
          </div>
          {categories.length > 0 && (
            <select value={manual.category}
              onChange={(e) => setManual((p) => ({ ...p, category: e.target.value }))} className={inputCls}>
              <option value="">Keine Kategorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}
          <input type="text" placeholder="Anmerkung (optional)" value={manual.requests}
            onChange={(e) => setManual((p) => ({ ...p, requests: e.target.value }))} className={inputCls} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={manualSaving || !manual.name.trim() || !manual.time} className={btnCls}>
              {manualSaving ? "Wird angelegt…" : "✓ Eintragen"}
            </button>
            <button type="button" onClick={() => { setShowManual(false); setManual(emptyManualForm); }}
              className="text-sm text-coffee/60 hover:text-coffee">
              Abbrechen
            </button>
            <span className="text-xs text-coffee/50">Keine Bestätigung nötig — wird sofort als bestätigt gespeichert.</span>
          </div>
        </form>
      )}

      {msg && <p className="mt-3 text-sm">{msg}</p>}
      {!data ? (
        <p className="mt-6 text-coffee/60">Lädt…</p>
      ) : (
        <>
          {/* Saat saat doluluk */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-coffee/60">
              Auslastung (Personen pro Stunde)
            </h3>
            <div className="mt-3 flex items-end gap-1.5">
              {data.hourly.map((h) => (
                <div key={h.hour} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold">{h.seated || ""}</span>
                  <div
                    className={`w-8 ${h.seated ? "bg-terra" : "bg-sand"}`}
                    style={{ height: `${Math.max(4, (h.seated / maxSeated) * 80)}px` }}
                    title={`${h.hour}: ${h.seated} Personen`}
                  />
                  <span className="text-[10px] text-coffee/50">{h.hour.slice(0, 2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rezervasyon listesi */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee/15 text-left text-xs uppercase tracking-wider text-coffee/50">
                  <th className="py-2 pr-3">Zeit</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Pers.</th>
                  <th className="py-2 pr-3">Kategorie</th>
                  <th className="py-2 pr-3">Kontakt</th>
                  <th className="py-2 pr-3">Tisch</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee/10">
                {data.reservations
                  .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time))
                  .map((r) => (
                    <tr key={r.id} className={r.status === "cancelled" ? "opacity-40 line-through" : ""}>
                      <td className="py-2.5 pr-3 font-semibold">{r.reservation_time.slice(0, 5)}</td>
                      <td className="py-2.5 pr-3">{r.guest_name}</td>
                      <td className="py-2.5 pr-3">{r.party_size}</td>
                      <td className="py-2.5 pr-3 text-xs">{r.category || "—"}</td>
                      <td className="py-2.5 pr-3 text-xs">{r.guest_phone || r.guest_email || "—"}</td>
                      <td className="py-2.5 pr-3">
                        {data.settings.use_tables ? (
                          <select
                            value={r.table_id || ""}
                            onChange={(e) => changeTable(r.id, e.target.value)}
                            className="border border-coffee/20 bg-cream px-2 py-1"
                            disabled={r.status === "cancelled"}
                          >
                            <option value="">—</option>
                            {data.tables.map((t) => (
                              <option key={t.id} value={t.id}>
                                Tisch {t.table_number} ({t.seats}P)
                              </option>
                            ))}
                          </select>
                        ) : ("—")}
                      </td>
                      <td className="py-2.5 text-right">
                        {r.status !== "cancelled" && (
                          <button onClick={() => cancel(r.id)} className="text-xs text-red-700 hover:underline">
                            Stornieren
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                {data.reservations.length === 0 && (
                  <tr><td colSpan="7" className="py-6 text-center text-coffee/50">
                    Keine Reservierungen an diesem Tag.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SpeisenkarteTab({ adminKey, isMasterAdmin }) {
  const [galleryImages, setGalleryImages] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);
  const [newItem, setNewItem] = useState({ sectionId: null, name: "", description: "", price: "" });
  const [msg, setMsg] = useState("");
  const itemFileRefs = useRef({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [galleryRes, menuRes] = await Promise.all([
        api("/api/admin/menu/gallery", adminKey),
        api("/api/admin/menu", adminKey),
      ]);
      setGalleryImages(galleryRes.images || []);
      setSections(menuRes.sections || []);
    } catch (e) {
      setMsg("Ladefehler: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function toggleGallery(key, current) {
    await fetch(`/api/admin/menu/gallery?key=${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ in_menu_gallery: !current }),
    });
    setGalleryImages((p) =>
      p.map((img) => img.image_key === key ? { ...img, in_menu_gallery: !current } : img)
    );
  }

  async function runScan() {
    if (!scanUrl) return;
    setScanning(true);
    setScanMsg("");
    try {
      const data = await api("/api/admin/menu/scan", adminKey, {
        method: "POST",
        body: JSON.stringify({ image_url: scanUrl }),
      });
      setScanMsg(`✓ ${data.sections} Abschnitte, ${data.items} Gerichte importiert.`);
      setScanUrl("");
      await loadAll();
    } catch (e) {
      setScanMsg("Fehler: " + e.message);
    } finally {
      setScanning(false);
    }
  }

  async function addSection(e) {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    try {
      const data = await api("/api/admin/menu", adminKey, {
        method: "POST",
        body: JSON.stringify({ type: "section", name: newSectionName.trim(), sort_order: sections.length }),
      });
      setSections((p) => [...p, { ...data.section, items: [] }]);
      setNewSectionName("");
      setExpandedSection(data.section?.id || null);
    } catch (e) {
      setMsg("Fehler: " + e.message);
    }
  }

  async function deleteSection(id) {
    if (!confirm("Diesen Abschnitt und alle enthaltenen Gerichte löschen?")) return;
    await fetch(`/api/admin/menu?id=${id}&type=section`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    setSections((p) => p.filter((s) => s.id !== id));
    if (expandedSection === id) setExpandedSection(null);
  }

  async function addItem(sectionId) {
    if (!newItem.name.trim()) return;
    try {
      const data = await api("/api/admin/menu", adminKey, {
        method: "POST",
        body: JSON.stringify({
          type: "item",
          section_id: sectionId,
          name: newItem.name.trim(),
          description: newItem.description.trim(),
          price: newItem.price.trim(),
          sort_order: sections.find((s) => s.id === sectionId)?.items?.length || 0,
        }),
      });
      setSections((p) =>
        p.map((s) => s.id === sectionId ? { ...s, items: [...(s.items || []), data.item] } : s)
      );
      setNewItem({ sectionId: null, name: "", description: "", price: "" });
    } catch (e) {
      setMsg("Fehler: " + e.message);
    }
  }

  async function deleteItem(sectionId, itemId) {
    await fetch(`/api/admin/menu?id=${itemId}&type=item`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    setSections((p) =>
      p.map((s) => s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s)
    );
  }

  async function uploadItemImage(sectionId, item, file) {
    setMsg("");
    const fd = new FormData();
    fd.append("item_id", item.id);
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "x-admin-key": adminKey },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSections((p) =>
        p.map((s) =>
          s.id === sectionId
            ? { ...s, items: s.items.map((i) => i.id === item.id ? { ...i, image_url: d.url } : i) }
            : s
        )
      );
      setMsg("✓ Bild hochgeladen!");
    } catch (e) {
      setMsg("Fehler: " + e.message);
    }
  }

  if (loading) return <p className="mt-8 text-coffee/50 text-sm">Lädt…</p>;

  return (
    <div className="mt-8 space-y-10">
      {msg && (
        <p className="text-sm px-3 py-2 border rounded bg-green-50 border-green-200 text-green-700">{msg}</p>
      )}

      {/* 1. Gallery */}
      <div>
        <h3 className="text-sm font-semibold text-coffee mb-1">Galerie (Foodfotos)</h3>
        <p className="text-xs text-coffee/50 mb-4">
          Fotos hochladen: Tab „🖼 Bilder" → Abschnitt „Foodfotos".
          Hier kannst du wählen, welche Fotos in der Speisekarten-Galerie erscheinen (✓ = sichtbar).
        </p>
        {galleryImages.length === 0 ? (
          <div className="border border-dashed border-coffee/15 rounded p-6 text-center text-coffee/40">
            <p className="text-2xl mb-1">📷</p>
            <p className="text-sm">Noch keine Foodfotos. Gehe zu „🖼 Bilder" → Foodfotos, um welche hochzuladen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {galleryImages.map((img) => (
              <button
                key={img.image_key}
                onClick={() => toggleGallery(img.image_key, img.in_menu_gallery)}
                className={`relative rounded overflow-hidden border-2 transition ${
                  img.in_menu_gallery ? "border-terra" : "border-transparent opacity-50 hover:opacity-80"
                }`}
                title={img.in_menu_gallery ? "Sichtbar — klicken zum Ausblenden" : "Klicken zum Einblenden"}
              >
                <img src={img.url} alt={img.image_key} className="w-full aspect-square object-cover" />
                <div className={`absolute top-1 right-1 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition ${
                  img.in_menu_gallery ? "bg-terra text-white" : "bg-white/70 text-coffee/40"
                }`}>
                  {img.in_menu_gallery ? "✓" : "○"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. KI Scan — nur für Master-Admin */}
      {isMasterAdmin && (
        <div className="border border-coffee/10 rounded-lg p-4 bg-sand/20">
          <h3 className="text-sm font-semibold text-coffee mb-1">🤖 KI-Menüscan <span className="text-xs font-normal text-terra">(Master Admin)</span></h3>
          <p className="text-xs text-coffee/50 mb-3">
            Lade ein Foto der Menükarte in „🖼 Bilder" hoch, kopiere die URL und lass die KI
            die Speisekarte automatisch erstellen.
          </p>
          <div className="flex gap-2">
            <input
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="https://… (URL des Menükarten-Fotos)"
              className={`${inputCls} text-sm flex-1`}
            />
            <button onClick={runScan} disabled={!scanUrl || scanning} className={`${btnCls} shrink-0`}>
              {scanning ? "Scannt…" : "Scannen"}
            </button>
          </div>
          {scanMsg && (
            <p className={`mt-2 text-sm ${scanMsg.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>
              {scanMsg}
            </p>
          )}
        </div>
      )}

      {/* 3. Menu sections */}
      <div>
        <h3 className="text-sm font-semibold text-coffee mb-4">Speisekarte bearbeiten</h3>

        {sections.length === 0 && (
          <div className="border border-dashed border-coffee/15 rounded-lg py-10 text-center text-coffee/40 mb-4">
            <p className="text-3xl mb-2">🍽</p>
            <p className="text-sm">Noch keine Abschnitte. Füge einen hinzu oder nutze den KI-Scan.</p>
          </div>
        )}

        <div className="space-y-3">
          {sections.map((section) => (
            <div key={section.id} className="border border-coffee/15 rounded-lg">
              {/* Section header */}
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="font-semibold text-coffee flex-1 text-left flex items-center gap-2"
                >
                  <span className="text-coffee/40">{expandedSection === section.id ? "▾" : "▸"}</span>
                  {section.name}
                  <span className="text-xs font-normal text-coffee/40 ml-1">
                    ({section.items?.length || 0} Gerichte)
                  </span>
                </button>
                <button onClick={() => deleteSection(section.id)}
                  className="text-xs text-red-500 hover:underline ml-4">
                  Löschen
                </button>
              </div>

              {/* Items */}
              {expandedSection === section.id && (
                <div className="border-t border-coffee/10 px-4 py-4 space-y-3">
                  {(section.items || []).map((item) => (
                    <div key={item.id} className="flex gap-3 items-start border border-coffee/10 rounded p-3">
                      {/* Photo */}
                      <div className="shrink-0">
                        {item.image_url ? (
                          <div className="relative group cursor-pointer"
                            onClick={() => itemFileRefs.current[item.id]?.click()}>
                            <img src={item.image_url} alt={item.name}
                              className="w-16 h-12 object-cover rounded" />
                            <div className="absolute inset-0 bg-black/40 text-white text-xs flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition">
                              Ändern
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => itemFileRefs.current[item.id]?.click()}
                            className="w-16 h-12 border-2 border-dashed border-coffee/20 rounded flex items-center justify-center text-coffee/30 hover:border-terra hover:text-terra text-lg transition">
                            📷
                          </button>
                        )}
                        <input type="file" accept="image/*" className="hidden"
                          ref={(el) => { itemFileRefs.current[item.id] = el; }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadItemImage(section.id, item, f);
                            e.target.value = "";
                          }}
                        />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-coffee">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-coffee/50 mt-0.5">{item.description}</p>
                        )}
                        {item.price && (
                          <p className="text-xs text-terra font-semibold mt-1">{item.price}</p>
                        )}
                      </div>
                      <button onClick={() => deleteItem(section.id, item.id)}
                        className="text-red-400 hover:text-red-600 font-bold shrink-0 px-1">
                        ×
                      </button>
                    </div>
                  ))}

                  {/* Add item form */}
                  {newItem.sectionId === section.id ? (
                    <div className="border border-terra/20 rounded p-3 space-y-2 bg-terra/5">
                      <input
                        value={newItem.name}
                        onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Gerichtname *"
                        className={`${inputCls} text-sm`}
                        autoFocus
                      />
                      <input
                        value={newItem.description}
                        onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                        placeholder="Beschreibung (optional)"
                        className={`${inputCls} text-sm`}
                      />
                      <div className="flex gap-2">
                        <input
                          value={newItem.price}
                          onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))}
                          placeholder="Preis (z.B. 12,90 €)"
                          className={`${inputCls} text-sm`}
                        />
                        <button
                          onClick={() => addItem(section.id)}
                          disabled={!newItem.name.trim()}
                          className={`${btnCls} shrink-0`}
                        >
                          +
                        </button>
                        <button
                          onClick={() => setNewItem({ sectionId: null, name: "", description: "", price: "" })}
                          className="px-3 text-sm text-coffee/50 hover:text-coffee"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewItem({ sectionId: section.id, name: "", description: "", price: "" })}
                      className="text-sm text-terra hover:underline"
                    >
                      + Gericht hinzufügen
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add section */}
        <form onSubmit={addSection} className="mt-4 flex gap-2">
          <input
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="Neuer Abschnitt (z.B. Vorspeisen, Hauptgerichte…)"
            className={`${inputCls} text-sm flex-1`}
          />
          <button disabled={!newSectionName.trim()} className={`${btnCls} shrink-0`}>
            + Abschnitt
          </button>
        </form>
      </div>
    </div>
  );
}
