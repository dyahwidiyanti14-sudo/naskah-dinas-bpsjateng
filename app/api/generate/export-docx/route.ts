import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { htmlToDocxBuffer } from "@/lib/docxTemplate";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const html = body?.html as string | undefined;
  const fileName = (body?.fileName as string | undefined) || "naskah-dinas.docx";

  if (!html) {
    return NextResponse.json({ error: "Konten pratinjau kosong" }, { status: 400 });
  }

  try {
    const buffer = await htmlToDocxBuffer(html);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal membuat file DOCX: " + err.message },
      { status: 500 }
    );
  }
}
