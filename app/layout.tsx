import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Aplikasi Naskah Dinas",
  description: "Pembuatan Memorandum, Nota Dinas, Surat Tugas, dan Surat Dinas per Tim Kerja",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
