import siteData from "../data/site-data.json";

export default function Gallery() {
  const { images, restaurant } = siteData;
  const photos = [
    images.gallery_1,
    images.gallery_2,
    images.gallery_3,
  ].filter(Boolean);

  if (photos.length === 0) return null;

  return (
    <section id="galerie" className="py-20 bg-cream">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Galerie</h2>
        <div className="mx-auto mt-2 h-1 w-16 rounded bg-terra" />
        <div className={`mt-10 grid gap-4 ${photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
          {photos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${restaurant.name} — Galerie ${i + 1}`}
              className="h-64 w-full rounded-2xl object-cover shadow-md"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
