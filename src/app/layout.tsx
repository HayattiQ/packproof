import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

// Design type system: Space Grotesk (display), JetBrains Mono (mono),
// Zen Kaku Gothic New (base). Exposed as CSS variables that globals.css
// references through --f-disp / --f-mono / --f-jp.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-zen-kaku",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PackProof — App",
  description:
    "Snap a PSA-graded card; PackProof's AI authenticates it against PSA's registry, prices it, and mints a redeemable, independently-verifiable external NFT on Mantle — with provably-fair packs and a no-wallet happy path.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font CSS variables go on <html> (:root) so globals.css's --f-disp /
    // --f-mono / --f-jp definitions in :root can resolve them.
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${zenKaku.variable}`}>
      <body>{children}</body>
    </html>
  );
}
