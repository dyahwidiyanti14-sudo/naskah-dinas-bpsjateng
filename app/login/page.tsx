"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Username atau password tim salah.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">ND</div>
        <div className="card">
          <h1>Naskah Dinas</h1>
          <p>Masuk menggunakan akun tim kerja Anda untuk membuat naskah dinas.</p>

          {error && <div className="error">⚠️ {error}</div>}

          <form onSubmit={handleSubmit}>
            <label>Username Tim</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? (
                <>
                  <span className="spinner" /> Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
