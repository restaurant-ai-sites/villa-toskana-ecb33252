import siteData from "../data/site-data.json";

const links = [
  { href: "/#ueber-uns", label: "Über uns" },
  { href: "/#speisekarte", label: "Speisekarte" },
  { href: "/#kontakt", label: "Kontakt" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-coffee/10 bg-cream/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <a href="/" className="font-display text-xl font-bold tracking-tight">
          {siteData.restaurant.name}
        </a>
        <ul className="flex items-center gap-5 text-sm sm:gap-8">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition-colors hover:text-terra/70">
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="/reservierung"
              className="bg-terra px-5 py-2.5 text-sm text-cream transition-colors hover:bg-terradark"
            >
              Reservieren
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
