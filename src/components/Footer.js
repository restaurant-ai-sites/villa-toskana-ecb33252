import siteData from "../data/site-data.json";

export default function Footer() {
  const { restaurant, content } = siteData;

  return (
    <footer className="bg-coffee py-10 text-cream/80">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <p className="font-display text-lg font-bold text-cream">{restaurant.name}</p>
        {content.footerText && <p className="mt-2 text-sm">{content.footerText}</p>}
        <div className="mt-5 flex justify-center gap-6 text-sm">
          <a href="/impressum" className="hover:text-cream">Impressum</a>
          <a href="/datenschutz" className="hover:text-cream">Datenschutz</a>
        </div>
        <p className="mt-5 text-xs text-cream/50">
          © {new Date().getFullYear()} {restaurant.name}. Alle Rechte vorbehalten.
        </p>
      </div>
    </footer>
  );
}
