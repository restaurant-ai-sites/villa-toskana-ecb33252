import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import ScrollReveal from "../components/ScrollReveal";
import siteData from "../data/site-data.json";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const bodyFont = Jost({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata = {
  title: siteData.seo.title || siteData.restaurant.name,
  description: siteData.seo.description,
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body><ScrollReveal />{children}</body>
    </html>
  );
}
