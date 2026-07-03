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

export default async function About() {
  const { restaurant, images: defaultImages } = siteData;
  const overrides = await getImageOverrides();
  const images = { ...defaultImages, ...overrides };
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
