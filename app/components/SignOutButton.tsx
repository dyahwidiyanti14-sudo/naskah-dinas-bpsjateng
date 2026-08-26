"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      className="btn-secondary"
      style={{ marginTop: 0 }}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Keluar
    </button>
  );
}
