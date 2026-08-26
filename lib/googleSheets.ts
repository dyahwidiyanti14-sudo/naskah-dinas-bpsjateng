import { getSheetsClient } from "./googleDrive";

/**
 * Appends one row to a team's rekap spreadsheet.
 * Expected column order (create this header row once, manually, in each
 * team's spreadsheet):
 * Tanggal | Jenis Naskah | Nomor | Perihal | Dibuat Oleh | Link Naskah | Link Dasar Surat Perintah
 */
export async function appendRekapRow(
  spreadsheetId: string,
  sheetName: string,
  row: (string | number)[]
) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:G`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [row],
    },
  });
}

/**
 * Reads all rekap rows for a team (excluding header row) - used for the
 * "Daftar Naskah" view.
 */
export async function readRekapRows(spreadsheetId: string, sheetName: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:G`,
  });
  return res.data.values ?? [];
}
