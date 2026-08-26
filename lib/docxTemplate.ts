import fs from "fs";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import mammoth from "mammoth";
// html-to-docx has no bundled types; requiring it dynamically keeps the
// server bundle small since it's only needed inside the API routes below.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HTMLtoDOCX = require("html-to-docx");

/**
 * Reads the raw document.xml from a .docx file and extracts every
 * {placeholder} tag found in it (Docxtemplater's default delimiters
 * are "{" and "}", matching the templates you've already prepared).
 *
 * NOTE: for this to work reliably, each placeholder must be typed as a
 * single continuous run in Word (i.e. don't change formatting/font
 * halfway through typing "{nama_pegawai}") - otherwise Word can split
 * it into multiple XML runs and the tag won't be detected. This is the
 * same requirement Docxtemplater itself has for rendering.
 */
export function extractPlaceholders(templateBuffer: Buffer): string[] {
  const zip = new PizZip(templateBuffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  // Strip XML tags to reconstruct the visible text stream
  const plainText = xml.replace(/<[^>]+>/g, "");
  const matches = plainText.match(/\{[^{}]+\}/g) ?? [];
  const tags = matches.map((m) => m.slice(1, -1).trim());
  return Array.from(new Set(tags)).filter(Boolean);
}

export function extractPlaceholdersFromFile(templatePath: string): string[] {
  const buffer = fs.readFileSync(templatePath);
  return extractPlaceholders(buffer);
}

/**
 * Fills a .docx template with the given data and returns the resulting
 * file as a Buffer, ready to be uploaded or downloaded.
 */
export function fillTemplate(
  templateBuffer: Buffer,
  data: Record<string, string>
): Buffer {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  doc.render(data);

  const outBuffer = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return outBuffer;
}

export function fillTemplateFromFile(
  templatePath: string,
  data: Record<string, string>
): Buffer {
  const buffer = fs.readFileSync(templatePath);
  return fillTemplate(buffer, data);
}

/**
 * Converts a filled .docx buffer into HTML for the editable on-screen
 * preview. Uses mammoth, which reads the BODY content of the document
 * (paragraphs, tables, inline images) but does not read Word's native
 * Header/Footer objects.
 *
 * IMPORTANT LIMITATION: if a template's kop surat / letterhead is placed
 * in Word's Header (Insert > Header) rather than typed directly at the
 * top of the document body, it will NOT appear in the preview and will
 * NOT be present in the final DOCX/PDF produced from the edited preview
 * (see htmlToDocxBuffer below). For naskah dinas templates, keep the kop
 * surat as a normal table/paragraph at the top of the body so it survives
 * this preview -> edit -> export round trip.
 */
export async function docxBufferToPreviewHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      // Keep simple inline styling (bold/italic/underline/alignment) so the
      // preview looks like the source document without pulling in Word's
      // internal class names.
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h2:fresh",
        "p[style-name='Heading 2'] => h3:fresh",
      ],
    }
  );
  return result.value;
}

export function fillTemplateToPreviewHtml(
  templatePath: string,
  data: Record<string, string>
): Promise<string> {
  const filled = fillTemplateFromFile(templatePath, data);
  return docxBufferToPreviewHtml(filled);
}

/**
 * Converts the (possibly user-edited) preview HTML into a real .docx
 * buffer, used both for the "Unduh DOCX" button and for the file that
 * gets saved to Google Drive. This keeps the preview a true "what you
 * see is what you get" WYSIWYG step.
 */
export async function htmlToDocxBuffer(html: string): Promise<Buffer> {
  const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;
  const fileBuffer = await HTMLtoDOCX(wrapped, undefined, {
    table: { row: { cantSplit: true } },
    footer: false,
    header: false,
    margins: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
  });
  return Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
}
