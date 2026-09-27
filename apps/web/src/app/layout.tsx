import type { Metadata } from "next";


export const metadata: Metadata = {
  metadataBase: new URL("https://multisig.bdagsosorted.co.uk"),

  title: "BDAG Community Multisig | Community Treasury on BlockDAG",

  description:
    "Secure, transparent and community-controlled multisig treasury infrastructure for the BDAG ecosystem on BlockDAG Mainnet.",

  openGraph: {
    title: "BDAG Community Multisig",
    description:
      "Secure, transparent and community-controlled treasury infrastructure for the BDAG ecosystem.",
    url: "https://multisig.bdagsosorted.co.uk",
    siteName: "BDAG Community Multisig",
    type: "website",
    images: [
      {
        url: "/bdag-multisig-social-card.png",
        width: 1200,
        height: 630,
        alt: "BDAG Community Multisig - Community Treasury on BlockDAG",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "BDAG Community Multisig",
    description:
      "Secure, transparent and community-controlled treasury infrastructure for the BDAG ecosystem.",
    images: ["/bdag-multisig-social-card.png"],
  },
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
