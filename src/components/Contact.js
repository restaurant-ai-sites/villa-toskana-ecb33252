import siteData from "../data/site-data.json";

export default function Contact() {
  const { restaurant, content } = siteData;
  const hours = restaurant.openingHours || {};
  const hasHours = Object.keys(hours).length > 0;

  return (
    <section id="kontakt" className="mx-auto max-w-5xl px-4 py-20">
      <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
        {content.contactHeading || "Kontakt"}
      </h2>
      <div className="mx-auto mt-2 h-1 w-16 rounded bg-terra" />

      <div className={`mt-12 grid gap-10 ${hasHours ? "md:grid-cols-2" : "max-w-md mx-auto"}`}>
        <div className="rounded-2xl bg-sand/60 p-8">
          <h3 className="font-display text-xl font-bold">So finden Sie uns</h3>
          <ul className="mt-5 space-y-4 text-coffee/85">
            {restaurant.address && (
              <li className="flex gap-3">
                <span aria-hidden>📍</span>
                <span>{restaurant.address}</span>
              </li>
            )}
            {restaurant.phone && (
              <li className="flex gap-3">
                <span aria-hidden>📞</span>
                <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`} className="hover:text-terra">
                  {restaurant.phone}
                </a>
              </li>
            )}
            {restaurant.email && (
              <li className="flex gap-3">
                <span aria-hidden>✉️</span>
                <a href={`mailto:${restaurant.email}`} className="hover:text-terra">
                  {restaurant.email}
                </a>
              </li>
            )}
          </ul>
        </div>

        {hasHours && (
          <div className="rounded-2xl bg-sand/60 p-8">
            <h3 className="font-display text-xl font-bold">Öffnungszeiten</h3>
            <ul className="mt-5 space-y-2">
              {Object.entries(hours).map(([day, time]) => (
                <li key={day} className="flex justify-between gap-4 text-coffee/85">
                  <span>{day}</span>
                  <span className="font-medium">{String(time)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
