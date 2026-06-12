"use client";

import { useState } from "react";

const inputCls =
  "w-full border border-coffee/20 bg-cream px-4 py-3 text-coffee outline-none transition-colors focus:border-terra";

export default function ReservationForm() {
  // step: form → code → done
  const [step, setStep] = useState("form");
  const [date, setDate] = useState("");
  const [party, setParty] = useState(2);
  const [slots, setSlots] = useState(null);
  const [closed, setClosed] = useState(false);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [code, setCode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function loadSlots(d, p) {
    setSlots(null);
    setTime("");
    setClosed(false);
    if (!d) return;
    const res = await fetch("/api/reservations/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: d, party: p }),
    });
    const data = await res.json();
    if (data.closed) setClosed(true);
    setSlots(data.slots || []);
  }

  async function submitRequest(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/reservations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, time, party, name, email, phone, requests }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setRequestId(data.requestId);
      setSentTo(data.sentTo);
      setStep("code");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/reservations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setConfirmation(data.reservation);
      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === "done" && confirmation) {
    return (
      <div className="mt-12 border border-terra/30 bg-sand/50 p-10 text-center">
        <p className="text-5xl">✓</p>
        <h2 className="mt-4 font-display text-3xl font-semibold">Reservierung bestätigt!</h2>
        <p className="mt-4 text-coffee/80">
          {confirmation.name} · {confirmation.party}{" "}
          {confirmation.party === 1 ? "Person" : "Personen"}
          <br />
          {new Date(`${confirmation.date}T12:00:00`).toLocaleDateString("de-DE", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}{" "}
          um {confirmation.time} Uhr
          {confirmation.tableNumber && (
            <>
              <br />
              Tisch {confirmation.tableNumber}
            </>
          )}
        </p>
        <p className="mt-6 text-sm text-coffee/60">Wir freuen uns auf Ihren Besuch!</p>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={submitCode} className="mt-12 space-y-6">
        <p className="text-center text-coffee/80">
          Wir haben einen 6-stelligen Code an <strong>{sentTo}</strong> gesendet.
          <br />
          Bitte geben Sie ihn ein, um die Reservierung zu bestätigen.
        </p>
        <input
          className={`${inputCls} text-center text-2xl tracking-[0.5em]`}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="••••••"
          inputMode="numeric"
          autoFocus
          required
        />
        {error && <p className="text-center text-sm text-red-700">{error}</p>}
        <button
          disabled={loading || code.length !== 6}
          className="w-full bg-terra py-4 text-sm uppercase tracking-widest text-cream transition-colors hover:bg-terradark disabled:opacity-40"
        >
          {loading ? "Wird geprüft…" : "Reservierung bestätigen"}
        </button>
        <button
          type="button"
          onClick={() => { setStep("form"); setError(""); setCode(""); }}
          className="w-full text-sm text-coffee/60 underline underline-offset-4"
        >
          Zurück
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitRequest} className="mt-12 space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-coffee/70">Datum *</span>
          <input
            type="date" required min={today} value={date} className={inputCls}
            onChange={(e) => { setDate(e.target.value); loadSlots(e.target.value, party); }}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-coffee/70">Personen *</span>
          <select
            value={party} className={inputCls}
            onChange={(e) => { setParty(Number(e.target.value)); loadSlots(date, Number(e.target.value)); }}
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "Person" : "Personen"}</option>
            ))}
          </select>
        </label>
      </div>

      {date && closed && (
        <p className="border border-coffee/20 bg-sand/60 p-4 text-center text-sm">
          An diesem Tag haben wir geschlossen.
        </p>
      )}

      {date && !closed && slots !== null && (
        <div>
          <span className="mb-2 block text-sm text-coffee/70">Uhrzeit *</span>
          {slots.length === 0 ? (
            <p className="border border-coffee/20 bg-sand/60 p-4 text-center text-sm">
              Leider keine freien Zeiten an diesem Tag.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((s) => (
                <button
                  key={s} type="button" onClick={() => setTime(s)}
                  className={`border py-2 text-sm transition-colors ${
                    time === s
                      ? "border-terra bg-terra text-cream"
                      : "border-coffee/20 hover:border-terra"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-coffee/70">Name *</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-coffee/70">E-Mail *</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-coffee/70">Telefon</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-coffee/70">Anmerkungen</span>
        <textarea rows={2} value={requests} onChange={(e) => setRequests(e.target.value)} className={inputCls} />
      </label>

      {error && <p className="text-center text-sm text-red-700">{error}</p>}

      <button
        disabled={loading || !date || !time || !name}
        className="w-full bg-terra py-4 text-sm uppercase tracking-widest text-cream transition-colors hover:bg-terradark disabled:opacity-40"
      >
        {loading ? "Wird gesendet…" : "Reservierung anfragen"}
      </button>
      <p className="text-center text-xs text-coffee/50">
        Zur Bestätigung senden wir Ihnen einen Code. Ihre Daten werden nur für diese
        Reservierung verwendet (DSGVO).
      </p>
    </form>
  );
}
