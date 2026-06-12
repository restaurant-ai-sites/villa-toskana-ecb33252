import siteData from "../data/site-data.json";

function MenuItem({ item }) {
  if (typeof item === "string") {
    return <li className="py-2">{item}</li>;
  }
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <div>
        <p className="font-semibold">{item.name}</p>
        {item.description && (
          <p className="text-sm text-coffee/70">{item.description}</p>
        )}
      </div>
      {item.price && (
        <span className="shrink-0 font-semibold text-terra">{item.price}</span>
      )}
    </li>
  );
}

export default function Menu() {
  const sections = Array.isArray(siteData.menu) ? siteData.menu : [];
  const foodImage = siteData.images.food;

  if (sections.length === 0 && !foodImage) return null;

  return (
    <section id="speisekarte" className="bg-sand/50 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
          Speisekarte
        </h2>
        <div className="mx-auto mt-2 h-1 w-16 rounded bg-terra" />

        {foodImage && (
          <img
            src={foodImage}
            alt="Unsere Gerichte"
            className="mt-10 h-64 w-full rounded-2xl object-cover shadow-lg"
          />
        )}

        <div className="mt-10 space-y-10">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className="font-display text-xl font-bold text-terradark">
                {section.title || section.name || `Kategorie ${i + 1}`}
              </h3>
              <ul className="mt-3 divide-y divide-coffee/10">
                {(section.items || []).map((item, j) => (
                  <MenuItem key={j} item={item} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
