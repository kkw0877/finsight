"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function GoogleSignInButton() {
  const router = useRouter();

  async function handleClick() {
    const response = await fetch("/api/auth/signin", { method: "POST" });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    router.push("/dashboard");
  }

  return <Button onClick={handleClick}>Google로 로그인</Button>;
}
