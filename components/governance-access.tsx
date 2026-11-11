"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  locale: "en" | "zh";
}

export function GovernanceAccess({ locale }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(true);
  const labels = locale === "zh"
    ? { login: "管理员登录", dashboard: "治理观测", checking: "检查权限" }
    : { login: "Admin login", dashboard: "Governance", checking: "Checking access" };

  useEffect(() => {
    let active = true;
    fetch("/api/observability/summary", { cache: "no-store" })
      .then((response) => {
        if (active) setAuthenticated(response.ok);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      })
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!checked) {
    return <span className="border border-line bg-white px-4 py-2 text-sm text-stone-400">{labels.checking}</span>;
  }

  if (authenticated) {
    return (
      <Link className="border border-moss bg-moss px-4 py-2 text-sm text-white transition hover:bg-ink" href={`/${locale}/observability`}>
        {labels.dashboard}
      </Link>
    );
  }

  return (
    <Link className="border border-moss bg-white px-4 py-2 text-sm text-moss transition hover:bg-moss hover:text-white" href={`/${locale}/observability`}>
      {labels.login}
    </Link>
  );
}
