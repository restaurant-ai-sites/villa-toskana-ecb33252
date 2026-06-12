/**
 * Impressum/Datenschutz metinleri basit Markdown benzeri formatta gelir
 * ("## Başlık", "**kalın**"). Ek paket kullanmadan render eder.
 */
function renderLine(line, key) {
  if (line.startsWith("## ")) {
    return (
      <h2 key={key} className="mt-8 font-display text-2xl font-bold first:mt-0">
        {line.slice(3)}
      </h2>
    );
  }
  const parts = line.split("**");
  return (
    <p key={key} className="mt-3 leading-relaxed text-coffee/85">
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </p>
  );
}

export default function LegalText({ text }) {
  const lines = (text || "").split("\n").filter((l) => l.trim() !== "");
  return <div>{lines.map((line, i) => renderLine(line.trim(), i))}</div>;
}
