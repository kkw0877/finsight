"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();

  async function handleClick() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="text" onClick={handleClick}>
      로그아웃
    </Button>
  );
}
