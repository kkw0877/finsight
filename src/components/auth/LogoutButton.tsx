"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/Button";

type LogoutButtonProps = {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
};

export function LogoutButton({ user }: LogoutButtonProps) {
  const router = useRouter();

  useEffect(() => {
    if (!user || !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      return;
    }

    posthog.identify(user.id, {
      email: user.email,
      ...(user.name ? { name: user.name } : {}),
    });
  }, [user]);

  async function handleClick() {
    const response = await fetch("/api/auth/signout", { method: "POST" });
    if (!response.ok) return;

    if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      posthog.capture("user_logged_out");
      posthog.reset();
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="text" onClick={handleClick}>
      로그아웃
    </Button>
  );
}
