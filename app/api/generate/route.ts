import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocumentType } from "@/lib/documentTypes";
import { htmlToDocxBuffer } from "@/lib/docxTemplate";
import { getTeamById } from "@/lib/teams";
import { uploadFileToFolder, getOrCreateSubfolder } from "@/lib/googleDrive";
import { appendRekapRow } from "@/lib/googleSheets";

/**
 * Step 2 of "buat naskah": takes the (possibly user-edited) preview HTML
 * from the previous step and turns it into the final .docx, then uploads
 * it to the team's Drive folder and appends a row to the rekap
 * spreadsheet - exactly like before, just sourced from the edited
 * preview instead of straight from the form fields.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Team is taken from the authenticated session ONLY - never from client
  // input - this is what guarantees Tim A cannot write into Tim B's folder.
  const teamId = (session as any).teamId as string;
  const team = getTeamById(teamId);
  if (!team) {
    return NextResponse.json({ error: "Tim tidak ditemukan" }, { status: 403 });
  }

  const formData = await req.formData();
  const docTypeId = formData.get("docType") as string | null;
  if (!docTypeId) {
    return NextResponse.json({ error: "docType wajib diisi" }, { status: 400 });
  }

  const docType = getDocumentType(docTypeId);
  if (!docType) {
    return NextResponse.json({ error: "Jenis naskah tidak dikenal" }, { status: 400 });
  }

  const finalHtml = formData.get("finalHtml") as string | null;
  if (!finalHtml) {
    return NextResponse.json(
      { error: "Pratinjau naskah kosong. Silakan buat pratinjau terlebih dahulu." },
      { status: 400 }
    );
  }

  const nomorField = (formData.get("nomor") as string | null) || "";
  const perihalField = (formData.get("perihal") as string | null) || "";

  // Basis upload is mandatory for Surat Tugas.
  const basisFile = formData.get("basisFile") as File | null;
  if (docType.requiresBasisUpload && (!basisFile || basisFile.size === 0)) {
    return NextResponse.json(
      {
        error:
          "Surat Tugas wajib menyertakan unggahan Surat Perintah yang mendasarinya.",
      },
      { status: 400 }
    );
  }

  let filledBuffer: Buffer;
  try {
    filledBuffer = await htmlToDocxBuffer(finalHtml);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal membuat file DOCX final: " + err.message },
      { status: 500 }
    );
  }

  const timestamp = new Date();
  const stamp = timestamp.toISOString().replace(/[:.]/g, "-");
  const safeNomor = String(nomorField || stamp).replace(/[\\/]/g, "-");
  const fileName = `${docType.label} - ${safeNomor}.docx`;

  let uploaded;
  try {
    uploaded = await uploadFileToFolder(
      team.driveFolderId,
      fileName,
      filledBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal mengunggah naskah ke Google Drive: " + err.message },
      { status: 500 }
    );
  }

  // Upload the mandatory basis document for Surat Tugas into a dedicated
  // subfolder, kept alongside the team's own output folder.
  let basisLink = "";
  if (docType.requiresBasisUpload && basisFile) {
    try {
      const subfolderId = await getOrCreateSubfolder(
        team.driveFolderId,
        "Dasar Surat Perintah - Surat Tugas"
      );
      const basisBuffer = Buffer.from(await basisFile.arrayBuffer());
      const basisUpload = await uploadFileToFolder(
        subfolderId,
        `Dasar - ${fileName.replace(/\.docx$/, "")} - ${basisFile.name}`,
        basisBuffer,
        basisFile.type || "application/octet-stream"
      );
      basisLink = basisUpload.webViewLink;
    } catch (err: any) {
      return NextResponse.json(
        {
          error:
            "Naskah berhasil dibuat tetapi gagal mengunggah dasar Surat Perintah: " +
            err.message,
        },
        { status: 500 }
      );
    }
  }

  try {
    await appendRekapRow(team.spreadsheetId, team.sheetName, [
      timestamp.toLocaleString("id-ID"),
      docType.label,
      String(nomorField || "-"),
      perihalField,
      team.name,
      uploaded.webViewLink,
      basisLink,
    ]);
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          "Naskah berhasil diunggah tetapi gagal mencatat ke rekap spreadsheet: " +
          err.message,
        fileLink: uploaded.webViewLink,
      },
      { status: 207 }
    );
  }

  return NextResponse.json({
    success: true,
    fileLink: uploaded.webViewLink,
    basisLink: basisLink || null,
  });
}
