"use client";

import { useEffect, useState, useCallback } from "react";

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
  const [tab, setTab] = useState("reservierungen");
  const [error, setError] = useState("");

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/admin/settings", adminKey);
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
        .then(() => { setAdminKey(saved); setAuthed(true); })
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
    </main>
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

function ReservationsTab({ adminKey }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(
    () => api(`/api/admin/reservations?date=${date}`, adminKey).then(setData).catch((e) => setMsg(e.message)),
    [adminKey, date]
  );
  useEffect(() => { load(); }, [load]);

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
        {data?.settings?.use_tables && (
          <button onClick={autoAssign} className={btnCls}>
            🪑 Tische automatisch zuordnen
          </button>
        )}
      </div>
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
                  <tr><td colSpan="6" className="py-6 text-center text-coffee/50">
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
