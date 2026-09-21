import type { Metadata, Viewport } from "next";
import { Archivo_Black, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Bureau of Birthday Affairs",
  description:
    "Official adjudication of photographic evidence, lap times and tournament outcomes.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bureau",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2ede1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body
        className={`${archivoBlack.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
      >
        {/* The app is designed for a phone. On a laptop it sits in the middle
            of the desk like a document left out overnight. */}
        <div className="mx-auto min-h-dvh w-full max-w-[520px] border-ink/10 sm:border-x">
          {children}
        </div>
      </body>
    </html>
  );
}
