import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
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
      <body>{children}</body>
    </html>
  );
}
