"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/Button";

export function GoogleSignInButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      posthog.capture("google_sign_in_started");
    }

    const response = await fetch("/api/auth/signin", { method: "POST" });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "로그인에 실패했습니다.");
      return;
    }

    if (data.url) {
      window.location.href = data.url;
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div>
      <Button onClick={handleClick}>Google로 로그인</Button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
