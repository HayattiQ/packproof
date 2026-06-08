import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PackProof — AI-authenticated RWA for graded cards on Mantle",
  description:
    "Snap a PSA-graded card; PackProof's AI authenticates it against PSA's registry, prices it, and mints a redeemable, independently-verifiable external NFT on Mantle — with provably-fair packs and a no-wallet happy path.",
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
