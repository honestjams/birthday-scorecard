import type { Metadata, Viewport } from "next";
import {
  Archivo_Black,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  Press_Start_2P,
  Kaushan_Script,
} from "next/font/google";
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

// Accent faces used only in themed page heroes.
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const kaushan = Kaushan_Script({
  variable: "--font-kaushan",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Party",
  description: "Photo bingo, kart times, carspotting, a tournament, and one overall winner.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Party",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f6f9",
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
        className={`${archivoBlack.variable} ${plexSans.variable} ${plexMono.variable} ${pressStart.variable} ${kaushan.variable} antialiased`}
      >
        {/* Built for a phone; centred on larger screens. */}
        <div className="mx-auto min-h-dvh w-full max-w-[520px] bg-bg sm:border-x sm:border-line">
          {children}
        </div>
      </body>
    </html>
  );
}
