"use client";

import Link from "next/link";

interface Props {
  locale: "en" | "zh";
}

export function GovernanceAccess({ locale }: Props) {
  const labels = locale === "zh"
    ? { login: "管理员登录" }
    : { login: "Admin login" };

  return (
    <Link className="nav-link border-moss text-moss hover:bg-moss hover:text-white" href={`/${locale}/observability`}>
      {labels.login}
    </Link>
  );
}
