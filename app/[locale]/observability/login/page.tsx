"use client";

import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GovernanceLoginPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const zh = params.locale === "zh";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/observability/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    if (response.ok) {
      router.push(`/${params.locale}/observability`);
      router.refresh();
    } else {
      setError(zh ? "用户名或密码不正确。" : "Invalid username or password.");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md py-12">
      <p className="page-kicker">TASUKI KEIFU</p>
      <h1 className="page-title">{zh ? "管理员登录" : "Admin login"}</h1>
      <p className="page-description">{zh ? "登录后查看数据治理观测。" : "Sign in to view governance observability."}</p>
      <form className="panel mt-8 space-y-5" onSubmit={submit}>
        <label className="block text-sm">
          {zh ? "用户名" : "Username"}
          <input className="mt-2 w-full border border-line px-3 py-2" name="username" required autoComplete="username" />
        </label>
        <label className="block text-sm">
          {zh ? "密码" : "Password"}
          <input className="mt-2 w-full border border-line px-3 py-2" type="password" name="password" required autoComplete="current-password" />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button className="border border-moss bg-moss px-4 py-2 text-sm text-white hover:bg-ink" disabled={busy} type="submit">
          {busy ? (zh ? "登录中..." : "Signing in...") : (zh ? "登录" : "Sign in")}
        </button>
      </form>
    </section>
  );
}
