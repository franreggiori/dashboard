"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ password }) });
    if (!res.ok) return setError("Password inválido");
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen grid place-items-center bg-muted/40">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border bg-white p-6 space-y-4">
        <h1 className="text-xl font-semibold">Ingreso administrador</h1>
        <Input type="password" placeholder="ADMIN_PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </main>
  );
}
