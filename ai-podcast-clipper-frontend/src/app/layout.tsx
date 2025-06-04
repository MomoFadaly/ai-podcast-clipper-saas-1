import { type Metadata } from "next";
import { Geist } from "next/font/google";
import ClientProviders from "~/components/client-providers";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: "Podcast Clipper",
  description: "Podcast Clipper",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
