"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface FieldsResponse {
  docType: string;
  label: string;
  requiresBasisUpload: boolean;
  basisUploadLabel: string | null;
  fields: string[];
}

type Step = "form" | "preview";

function humanizeFieldName(field: string) {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickFieldValue(values: Record<string, string>, candidates: string[]) {
  for (const c of candidates) {
    if (values[c]) return values[c];
  }
  return "";
}

// Jenis naskah yang penomorannya TIDAK memakai kode derajat keamanan
// (mis. "B-", "R-", "SR-"), melainkan langsung dimulai dari nomor urut.
const DOC_TYPES_WITHOUT_KLASIFIKASI = ["memorandum", "nota-dinas"];

// Kode derajat keamanan yang lazim dipakai di depan nomor Surat Dinas
// (mis. B-1234/..., R-12/..., SR-3/...). Jika kode ini muncul di awal
// nomor Memorandum/Nota Dinas, kemungkinan besar itu salah tempel format.
const KLASIFIKASI_PREFIX_REGEX = /^\s*(SR|R|K|T|B)\s*[-/]/i;

function getNomorKlasifikasiWarning(
  docTypeId: string | undefined,
  field: string,
  value: string
): string | null {
  if (!docTypeId || !DOC_TYPES_WITHOUT_KLASIFIKASI.includes(docTypeId)) return null;
  if (!/nomor/i.test(field)) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = trimmed.match(KLASIFIKASI_PREFIX_REGEX);
  if (!match) return null;

  const kode = match[1].toUpperCase();
  const label = docTypeId === "memorandum" ? "Memorandum" : "Nota Dinas";
  return `Nomor ${label} sepertinya masih memakai kode derajat keamanan "${kode}-". Sesuai tata naskah dinas, ${label} tidak memakai kode derajat keamanan — penomoran langsung dimulai dari nomor urutnya (contoh: "12/ND-BPS3300/VIII/2026"), bukan "${kode}-...".`;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DocTypeFormPage() {
  const params = useParams();
  const docType = params.docType as string;

  const [config, setConfig] = useState<FieldsResponse | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [basisFile, setBasisFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ fileLink: string; basisLink: string | null } | null>(
    null
  );

  const [step, setStep] = useState<Step>("form");
  const [previewHtml, setPreviewHtml] = useState("");
  const [buildingPreview, setBuildingPreview] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/templates/${docType}/fields`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memuat template.");
        setLoading(false);
        return;
      }
      setConfig(data);
      setLoading(false);
    }
    load();
  }, [docType]);

  // Set the preview's HTML imperatively, exactly once when entering the
  // preview step. After that React never touches this div's contents
  // again, so the user's in-place edits (contentEditable) are never
  // clobbered by a re-render.
  useEffect(() => {
    if (step === "preview" && previewRef.current) {
      previewRef.current.innerHTML = previewHtml;
    }
  }, [step, previewHtml]);

  function currentFileBaseName() {
    const nomor = pickFieldValue(values, ["nomor", "nomor_surat"]);
    return `${config?.label ?? "Naskah"}${nomor ? " - " + nomor : ""}`.replace(/[\\/]/g, "-");
  }

  async function handleBuildPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setError("");
    setResult(null);

    if (config.requiresBasisUpload && !basisFile) {
      setError("Dasar Surat Perintah wajib diunggah untuk " + config.label + ".");
      return;
    }

    setBuildingPreview(true);
    try {
      const res = await fetch("/api/generate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: config.docType, fields: values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat pratinjau.");
        setBuildingPreview(false);
        return;
      }
      setPreviewHtml(data.html);
      setStep("preview");
    } catch (err: any) {
      setError("Gagal membuat pratinjau: " + err.message);
    }
    setBuildingPreview(false);
  }

  async function handleDownloadDocx() {
    if (!previewRef.current) return;
    setError("");
    setDownloadingDocx(true);
    try {
      const html = previewRef.current.innerHTML;
      const res = await fetch("/api/generate/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, fileName: `${currentFileBaseName()}.docx` }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Gagal mengunduh DOCX.");
        setDownloadingDocx(false);
        return;
      }
      const blob = await res.blob();
      triggerBlobDownload(blob, `${currentFileBaseName()}.docx`);
    } catch (err: any) {
      setError("Gagal mengunduh DOCX: " + err.message);
    }
    setDownloadingDocx(false);
  }

  async function handleDownloadPdf() {
    if (!previewRef.current) return;
    setError("");
    setDownloadingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `${currentFileBaseName()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(previewRef.current)
        .save();
    } catch (err: any) {
      setError("Gagal mengunduh PDF: " + err.message);
    }
    setDownloadingPdf(false);
  }

  async function handleSave() {
    if (!config || !previewRef.current) return;
    setError("");
    setResult(null);
    setSaving(true);

    const fd = new FormData();
    fd.append("docType", config.docType);
    fd.append("finalHtml", previewRef.current.innerHTML);
    fd.append("nomor", pickFieldValue(values, ["nomor", "nomor_surat"]));
    fd.append("perihal", pickFieldValue(values, ["perihal", "hal"]));
    if (basisFile) fd.append("basisFile", basisFile);

    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      setSaving(false);
      if (!res.ok && res.status !== 207) {
        setError(data.error || "Gagal menyimpan naskah.");
        return;
      }
      if (res.status === 207) {
        setError(data.error);
      }
      setResult({ fileLink: data.fileLink, basisLink: data.basisLink });
    } catch (err: any) {
      setSaving(false);
      setError("Gagal menyimpan naskah: " + err.message);
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1>{config?.label ?? "Memuat..."}</h1>
        <Link href="/dashboard" className="back-link">← Kembali</Link>
      </div>

      <div className="progress-steps">
        <span className={`progress-step ${step === "form" ? "active" : "done"}`}>
          <span className="progress-dot">{step === "form" ? "1" : "✓"}</span> Isi Form
        </span>
        <span className="progress-sep" />
        <span className={`progress-step ${step === "preview" ? "active" : ""}`}>
          <span className="progress-dot">2</span> Pratinjau &amp; Edit
        </span>
        <span className="progress-sep" />
        <span className={`progress-step ${result ? "done" : ""}`}>
          <span className="progress-dot">{result ? "✓" : "3"}</span> Simpan &amp; Unduh
        </span>
      </div>

      {error && <div className="error">⚠️ {error}</div>}
      {result && (
        <div className="success">
          ✅ Naskah berhasil disimpan ke Drive dan dicatat di rekap.{" "}
          <a href={result.fileLink} target="_blank" rel="noopener noreferrer">
            Buka file di Drive
          </a>
          {result.basisLink && (
            <>
              {" · "}
              <a href={result.basisLink} target="_blank" rel="noopener noreferrer">
                Buka dasar Surat Perintah
              </a>
            </>
          )}
          {" · "}
          <Link href="/documents">Lihat di Rekap Naskah →</Link>
        </div>
      )}

      {loading && step === "form" && <div className="card">Memuat form...</div>}

      {config && !loading && step === "form" && (
        <form className="card" onSubmit={handleBuildPreview}>
          <div className="card-header">
            <h2>Isi Data Naskah</h2>
            <p>Form ini terbentuk otomatis dari placeholder yang ada di template {config.label}.</p>
          </div>

          {config.fields.length === 0 && (
            <p>Template ini tidak memiliki placeholder yang terdeteksi.</p>
          )}

          {config.fields.map((field) => {
            const nomorWarning = getNomorKlasifikasiWarning(
              config.docType,
              field,
              values[field] ?? ""
            );
            return (
              <div key={field}>
                <label>{humanizeFieldName(field)}</label>
                <textarea
                  value={values[field] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                />
                {nomorWarning && <p className="field-warning">⚠️ {nomorWarning}</p>}
              </div>
            );
          })}

          {config.requiresBasisUpload && (
            <div>
              <label>{config.basisUploadLabel ?? "Unggah Dasar"}</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => setBasisFile(e.target.files?.[0] ?? null)}
                required={!basisFile}
              />
              <p className="field-hint">
                Wajib: unggah Surat Perintah yang menjadi dasar pembuatan {config.label} ini.
                {basisFile && ` File terpilih: ${basisFile.name}`}
              </p>
            </div>
          )}

          <button type="submit" disabled={buildingPreview}>
            {buildingPreview ? (
              <>
                <span className="spinner" /> Menyiapkan pratinjau...
              </>
            ) : (
              "Lanjut ke Pratinjau →"
            )}
          </button>
        </form>
      )}

      {step === "preview" && (
        <>
          <div className="preview-hint">
            ✏️ Pratinjau ini bisa langsung diedit — klik di bagian teks manapun pada
            lembar di bawah untuk memperbaikinya sebelum diunduh atau disimpan.
          </div>

          <div className="preview-toolbar">
            <button type="button" className="btn-secondary" onClick={() => setStep("form")}>
              ← Edit Form
            </button>
            <div className="btn-row">
              <button type="button" className="btn-outline-accent" onClick={handleDownloadDocx} disabled={downloadingDocx}>
                {downloadingDocx ? (<><span className="spinner" style={{ borderColor: "rgba(14,124,134,0.3)", borderTopColor: "var(--color-accent)" }} /> Menyiapkan...</>) : "⬇ Unduh DOCX"}
              </button>
              <button type="button" className="btn-outline-accent" onClick={handleDownloadPdf} disabled={downloadingPdf}>
                {downloadingPdf ? (<><span className="spinner" style={{ borderColor: "rgba(14,124,134,0.3)", borderTopColor: "var(--color-accent)" }} /> Menyiapkan...</>) : "⬇ Unduh PDF"}
              </button>
              <button type="button" className="btn-accent" onClick={handleSave} disabled={saving}>
                {saving ? (<><span className="spinner" /> Menyimpan...</>) : "💾 Simpan ke Drive & Catat Rekap"}
              </button>
            </div>
          </div>

          <div className="paper-backdrop">
            <div ref={previewRef} className="a4-page" contentEditable suppressContentEditableWarning />
          </div>
        </>
      )}
    </div>
  );
}
