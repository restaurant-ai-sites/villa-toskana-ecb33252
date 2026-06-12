import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ReservationForm from "../../components/ReservationForm";
import siteData from "../../data/site-data.json";

export const metadata = {
  title: `Tisch reservieren — ${siteData.restaurant.name}`,
};

export default function ReservierungPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-center text-xs uppercase tracking-[0.4em] text-coffee/60">
          {siteData.restaurant.name}
        </p>
        <h1 className="mt-3 text-center font-display text-4xl font-semibold sm:text-5xl">
          Tisch reservieren
        </h1>
        <div className="mx-auto mt-4 h-px w-16 bg-terra" />
        <ReservationForm />
      </main>
      <Footer />
    </>
  );
}
