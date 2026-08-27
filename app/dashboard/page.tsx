import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getDocumentTypes } from "@/lib/documentTypes";
import AppHeader from "@/app/components/AppHeader";

const ICONS: Record<string, string> = {
  memorandum: "📝",
  "nota-dinas": "🗒️",
  "surat-tugas": "🧭",
  "surat-dinas": "✉️",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const docTypes = getDocumentTypes();
  const teamName = (session as any).teamName;

  return (
    <>
      <AppHeader teamName={teamName} />
      <div className="container">
        <div className="card-header">
          <h1>Buat Naskah Dinas</h1>
          <p>Pilih jenis naskah dinas yang ingin dibuat. Form pengisian akan menyesuaikan otomatis dengan template masing-masing.</p>
        </div>

        <div className="grid">
          {docTypes.map((dt) => (
            <Link key={dt.id} href={`/dashboard/${dt.id}`} className="doc-type-btn">
              <strong>
                <span className="doc-type-icon">{ICONS[dt.id] ?? "📄"}</span>
                {dt.label}
              </strong>
              {dt.requiresBasisUpload && (
                <span className="badge badge-warning">⚠ Wajib unggah dasar Surat Perintah</span>
              )}
            </Link>
          ))}
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <h2>Rekap Naskah</h2>
          <p>Lihat seluruh naskah yang sudah dibuat tim Anda, lengkap dengan tautan file hasilnya.</p>
          <Link href="/documents" className="btn-secondary btn" style={{
            display: "inline-block", padding: "10px 18px", borderRadius: 8,
            border: "1.5px solid var(--color-border)", textDecoration: "none",
            fontWeight: 600, fontSize: 14, color: "var(--color-text)",
          }}>
            Lihat Rekap Naskah Tim Saya →
          </Link>
        </div>
      </div>
    </>
  );
}
