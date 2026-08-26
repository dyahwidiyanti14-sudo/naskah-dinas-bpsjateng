import fs from "fs";
import path from "path";

export interface DocumentTypeConfig {
  id: string;
  label: string;
  templateFile: string;
  requiresBasisUpload: boolean;
  basisUploadLabel?: string;
}

let cached: DocumentTypeConfig[] | null = null;

export function getDocumentTypes(): DocumentTypeConfig[] {
  if (cached) return cached;
  const configPath = path.join(process.cwd(), "config", "documentTypes.json");
  cached = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return cached!;
}

export function getDocumentType(id: string): DocumentTypeConfig | undefined {
  return getDocumentTypes().find((d) => d.id === id);
}

export function getTemplatePath(templateFile: string): string {
  return path.join(process.cwd(), "templates", templateFile);
}
