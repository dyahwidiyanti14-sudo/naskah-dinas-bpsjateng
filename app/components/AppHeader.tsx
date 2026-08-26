import SignOutButton from "@/app/components/SignOutButton";

export default function AppHeader({ teamName }: { teamName?: string }) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="app-header-logo">ND</div>
        <div>
          <div className="app-header-title">Naskah Dinas</div>
          <div className="app-header-subtitle">Memorandum · Nota Dinas · Surat Tugas · Surat Dinas</div>
        </div>
      </div>
      <div className="app-header-right">
        {teamName && <span className="team-badge">👤 {teamName}</span>}
        <SignOutButton />
      </div>
    </header>
  );
}
