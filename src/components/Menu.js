"use client";

import { useState, useEffect } from "react";
import siteData from "../data/site-data.json";

export default function Menu() {
  const [gallery, setGallery] = useState([]);
  const [sections, setSections] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((data) => {
        setGallery(data.gallery || []);
        if (data.sections?.length > 0) {
          setSections(data.sections);
        } else {
          setSections(buildStaticSections());
        }
        setLoaded(true);
      })
      .catch(() => {
        setSections(buildStaticSections());
        setLoaded(true);
      });
  }, []);

  if (!loaded) return null;
  if (!sections.length && !gallery.length) return null;

  return (
    <section id="speisekarte" className="bg-sand/50 py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">Speisekarte</h2>
        <div className="mx-auto mt-2 h-1 w-16 rounded bg-terra" />

        {/* Gallery */}
        {gallery.length > 0 && (
          <div
            className={`mt-10 grid gap-3 ${
              gallery.length === 1
                ? "grid-cols-1"
                : gallery.length === 2
                ? "grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {gallery.map((img, i) => (
              <div key={img.image_key || i} className="aspect-[4/3] overflow-hidden rounded-xl shadow">
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Static hero image fallback when no gallery */}
        {gallery.length === 0 && (siteData.images?.food || siteData.images?.gallery_1) && (
          <img
            src={siteData.images.food || siteData.images.gallery_1}
            alt="Unsere Gerichte"
            className="mt-10 h-64 w-full rounded-2xl object-cover shadow-lg"
          />
        )}

        {/* Menu sections */}
        {sections.length > 0 && (
          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <div key={section.id}>
                <h3 className="font-display text-xl font-bold text-terradark">
                  {section.name}
                </h3>
                <ul className="mt-3 divide-y divide-coffee/10">
                  {(section.items || [])
                    .filter((i) => i.is_active !== false)
                    .map((item) => (
                      <li key={item.id} className="flex gap-4 py-3 items-start">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-16 object-cover rounded-lg shrink-0"
                          />
                        )}
                        <div className="flex flex-1 items-baseline justify-between gap-4 min-w-0">
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-coffee/70">{item.description}</p>
                            )}
                          </div>
                          {item.price && (
                            <span className="shrink-0 font-semibold text-terra">{item.price}</span>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function buildStaticSections() {
  const menu = Array.isArray(siteData.menu) ? siteData.menu : [];
  return menu.map((sec, i) => ({
    id: `static-${i}`,
    name: sec.title || sec.name || `Kategorie ${i + 1}`,
    items: (sec.items || []).map((item, j) => ({
      id: `static-${i}-${j}`,
      name: typeof item === "string" ? item : item.name || item.dish || "",
      description: typeof item === "string" ? "" : item.description || "",
      price: typeof item === "string" ? "" : item.price || "",
      image_url: "",
      is_active: true,
    })),
  }));
}
