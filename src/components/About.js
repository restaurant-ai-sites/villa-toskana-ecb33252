import siteData from "../data/site-data.json";

export default function About() {
  const { restaurant, images } = siteData;
  const sideImage = images.about || images.interior || images.food || images.exterior;

  return (
    <section id="ueber-uns" className="mx-auto max-w-5xl px-4 py-20">
      <div className={`grid items-center gap-10 ${sideImage ? "md:grid-cols-2" : ""}`}>
        <div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Über uns</h2>
          <div className="mt-2 h-1 w-16 rounded bg-terra" />
          <p className="mt-6 whitespace-pre-line leading-relaxed text-coffee/85">
            {restaurant.about}
          </p>
        </div>
        {sideImage && (
          <img
            src={sideImage}
            alt={`${restaurant.name} — Einblick`}
            className="h-80 w-full rounded-2xl object-cover shadow-xl"
          />
        )}
      </div>
    </section>
  );
}
