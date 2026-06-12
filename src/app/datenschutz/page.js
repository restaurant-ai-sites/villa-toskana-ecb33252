import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import LegalText from "../../components/LegalText";
import siteData from "../../data/site-data.json";

export const metadata = {
  title: `Datenschutz — ${siteData.restaurant.name}`,
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <LegalText text={siteData.legal.datenschutz} />
        <a href="/" className="mt-10 inline-block text-terra hover:underline">
          ← Zurück zur Startseite
        </a>
      </main>
      <Footer />
    </>
  );
}
