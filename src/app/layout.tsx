import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PackProof",
  description:
    "Provably fair NFT mystery packs for physical trading-card collectibles on Mantle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
