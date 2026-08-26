import fs from "fs";
import path from "path";

export interface Team {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  driveFolderId: string;
  spreadsheetId: string;
  sheetName: string;
}

let cachedTeams: Team[] | null = null;

/**
 * Loads team configuration.
 * Priority: TEAMS_CONFIG_JSON env var (recommended for Vercel, since the
 * filesystem there is read-only/ephemeral at runtime for anything not
 * bundled at build time) -> falls back to config/teams.json in the repo
 * (useful for local development).
 */
export function getTeams(): Team[] {
  if (cachedTeams) return cachedTeams;

  if (process.env.TEAMS_CONFIG_JSON) {
    cachedTeams = JSON.parse(process.env.TEAMS_CONFIG_JSON);
    return cachedTeams!;
  }

  const configPath = path.join(process.cwd(), "config", "teams.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(
      "Konfigurasi tim tidak ditemukan. Buat config/teams.json (lihat teams.example.json) " +
        "atau set environment variable TEAMS_CONFIG_JSON."
    );
  }
  cachedTeams = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return cachedTeams!;
}

export function getTeamByUsername(username: string): Team | undefined {
  return getTeams().find((t) => t.username === username);
}

export function getTeamById(id: string): Team | undefined {
  return getTeams().find((t) => t.id === id);
}
