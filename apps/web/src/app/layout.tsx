import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BDAG Multisig",
  description: "BDAG Community Multisig",
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
