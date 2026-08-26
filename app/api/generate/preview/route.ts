import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDocumentType, getTemplatePath } from "@/lib/documentTypes";
import { extractPlaceholdersFromFile, fillTemplateToPreviewHtml } from "@/lib/docxTemplate";

/**
 * Step 1 of "buat naskah": fills the real .docx template with the values
 * the user typed into the form, then converts the result to HTML so it
 * can be shown as an editable, on-screen preview before anything is
 * uploaded to Drive or written to the rekap spreadsheet.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const docTypeId = body?.docType as string | undefined;
  const fieldValues = (body?.fields ?? {}) as Record<string, string>;

  if (!docTypeId) {
    return NextResponse.json({ error: "docType wajib diisi" }, { status: 400 });
  }

  const docType = getDocumentType(docTypeId);
  if (!docType) {
    return NextResponse.json({ error: "Jenis naskah tidak dikenal" }, { status: 400 });
  }

  const templatePath = getTemplatePath(docType.templateFile);
  const expectedFields = extractPlaceholdersFromFile(templatePath);
  const data: Record<string, string> = {};
  for (const field of expectedFields) {
    data[field] = fieldValues[field] ?? "";
  }

  try {
    const html = await fillTemplateToPreviewHtml(templatePath, data);
    return NextResponse.json({ html, docType: docType.id, label: docType.label });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal membuat pratinjau: " + err.message },
      { status: 500 }
    );
  }
}
