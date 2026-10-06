import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_JP } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });
const plexJp = IBM_Plex_Sans_JP({ variable: "--font-plex-jp", subsets: ["latin"], weight: ["400", "500", "700"], preload: false });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Plant A Maintenance Agent",
  description: "An AI maintenance assistant that answers with evidence you can trace on a knowledge graph. Gemini + ADK + Neo4j on Google Cloud.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${plexJp.variable} ${plexMono.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
