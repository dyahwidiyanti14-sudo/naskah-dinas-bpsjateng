import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Builds an authenticated Google Drive client from a service account.
 * Set GOOGLE_SERVICE_ACCOUNT_KEY as the full JSON key content, base64
 * encoded, in your environment variables (works for both local .env
 * and Vercel project settings).
 *
 * IMPORTANT: each team's Drive output folder (and spreadsheet) must be
 * *shared* with the service account's email address
 * (client_email field in the JSON key) with Editor access, otherwise
 * uploads/appends will fail with a permission error.
 */
function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY belum diset di environment variables.");
  }
  const jsonString = Buffer.from(raw, "base64").toString("utf-8");
  return JSON.parse(jsonString);
}

function getAuth() {
  const credentials = getServiceAccountCredentials();
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  });
}

export function getDriveClient() {
  const auth = getAuth();
  return google.drive({ version: "v3", auth });
}

export function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

/**
 * Uploads a file into a specific Drive folder and returns its id + link.
 */
export async function uploadFileToFolder(
  folderId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ id: string; webViewLink: string }> {
  const drive = getDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: bufferToStream(buffer),
    },
    fields: "id, webViewLink",
  });

  return {
    id: res.data.id as string,
    webViewLink: res.data.webViewLink as string,
  };
}

/**
 * Ensures a subfolder exists inside a parent folder (used for storing
 * the "surat perintah" basis files for Surat Tugas separately).
 * Returns the subfolder's id, creating it if it doesn't exist yet.
 */
export async function getOrCreateSubfolder(
  parentFolderId: string,
  subfolderName: string
): Promise<string> {
  const drive = getDriveClient();

  const existing = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${subfolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id as string;
  }

  const created = await drive.files.create({
    requestBody: {
      name: subfolderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return created.data.id as string;
}

/**
 * Lists files inside a team's folder (used for the "Rekap/Dokumen" list
 * view) - scoped strictly to the given folderId, so a team can never
 * see another team's files.
 */
export async function listFilesInFolder(folderId: string) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, webViewLink, createdTime, mimeType)",
    orderBy: "createdTime desc",
    pageSize: 100,
  });
  return res.data.files ?? [];
}
