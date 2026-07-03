import siteData from "../data/site-data.json";

async function getImageOverrides() {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SECRET_KEY;
  const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
  if (!SB_URL || !SB_KEY || !PROJECT_ID) return {};
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/site_images?project_id=eq.${PROJECT_ID}&select=image_key,url`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: "no-store" }
    );
    const rows = await res.json();
    const map = {};
    (rows || []).forEach((r) => { map[r.image_key] = r.url; });
    return map;
  } catch { return {}; }
}

export default async function Hero() {
  const { restaurant, content, images: defaultImages } = siteData;
  const overrides = await getImageOverrides();
  const images = { ...defaultImages, ...overrides };

  return (
    <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
      {images.hero ? (
        <>
          <img
            src={images.hero}
            alt={restaurant.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-coffee/50" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-sand via-cream to-sand" />
      )}

      <div className={`relative z-10 mx-auto max-w-3xl px-4 py-24 text-center ${images.hero ? "text-cream" : "text-coffee"}`}>
        <p className="mb-5 text-xs uppercase tracking-[0.4em] opacity-80">
          {restaurant.cuisine || restaurant.tagline}
        </p>
        <h1 className="font-display text-5xl font-semibold leading-tight sm:text-7xl">
          {content.welcomeHeading || restaurant.name}
        </h1>
        {content.welcomeSubtext && (
          <p className="mx-auto mt-6 max-w-xl text-lg font-light opacity-90">
            {content.welcomeSubtext}
          </p>
        )}
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="/reservierung"
            className="bg-terra px-9 py-4 text-sm uppercase tracking-widest text-cream transition-colors hover:bg-terradark"
          >
            {content.reservationCta || "Tisch reservieren"}
          </a>
          <a
            href="/#speisekarte"
            className={`border px-9 py-4 text-sm uppercase tracking-widest transition-colors ${images.hero ? "border-cream/60 text-cream hover:bg-cream/10" : "border-coffee/40 text-coffee hover:bg-coffee/5"}`}
          >
            Speisekarte
          </a>
        </div>
      </div>
    </section>
  );
}
