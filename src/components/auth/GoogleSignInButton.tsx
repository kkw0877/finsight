"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function GoogleSignInButton() {
  const router = useRouter();

  async function handleClick() {
    await fetch("/api/auth/signin", { method: "POST" });
    router.push("/dashboard");
  }

  return <Button onClick={handleClick}>Google로 로그인</Button>;
}
