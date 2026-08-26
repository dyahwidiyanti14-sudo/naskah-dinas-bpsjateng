"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/app/components/AppHeader";

export default function DocumentsPage() {
  const [rows, setRows] = useState<string[][]>([]);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memuat rekap.");
        setLoading(false);
        return;
      }
      setRows(data.rows || []);
      setTeamName(data.team);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <AppHeader teamName={teamName} />
      <div className="container">
        <div className="topbar">
          <h1>Rekap Naskah</h1>
          <Link href="/dashboard" className="back-link">← Kembali ke Dashboard</Link>
        </div>

        {error && <div className="error">⚠️ {error}</div>}

        <div className="card">
          {loading ? (
            <p>Memuat rekap...</p>
          ) : rows.length === 0 && !error ? (
            <div className="empty-state">
              📭 Belum ada naskah yang dibuat oleh tim ini.
            </div>
          ) : (
            !error && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis</th>
                      <th>Nomor</th>
                      <th>Perihal</th>
                      <th>Naskah</th>
                      <th>Dasar Surat Perintah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td>{row[0]}</td>
                        <td><span className="doc-type-pill">{row[1]}</span></td>
                        <td>{row[2]}</td>
                        <td>{row[3]}</td>
                        <td>
                          {row[5] && (
                            <a href={row[5]} target="_blank" rel="noopener noreferrer" className="file-link">
                              📄 Buka
                            </a>
                          )}
                        </td>
                        <td>
                          {row[6] && (
                            <a href={row[6]} target="_blank" rel="noopener noreferrer" className="file-link">
                              📎 Buka
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
