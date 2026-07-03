import GallerySlider from "./GallerySlider";

async function getGalleryImages() {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SECRET_KEY;
  const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
  if (!SB_URL || !SB_KEY || !PROJECT_ID) return [];
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/site_images?project_id=eq.${PROJECT_ID}&select=image_key,url`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }, cache: "no-store" }
    );
    const rows = await res.json();
    const keys = ["gallery_1", "gallery_2", "gallery_3", "gallery_4", "gallery_5"];
    return keys.map((k) => (rows || []).find((r) => r.image_key === k)?.url).filter(Boolean);
  } catch { return []; }
}

export default async function Gallery() {
  const images = await getGalleryImages();
  if (!images.length) return null;
  return (
    <section id="galerie" className="bg-sand/30 py-20">
      <div className="mx-auto max-w-5xl px-4 text-center mb-10">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Galerie</h2>
        <div className="mx-auto mt-2 h-1 w-16 rounded bg-terra" />
      </div>
      <GallerySlider images={images} />
    </section>
  );
}
