"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function HubSpotCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      sessionStorage.setItem("hubspot_token", token);
      router.push("/?hubspot=connected");
    } else {
      router.push("/?hubspot=error");
    }
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔗</div>
        <p className="text-gray-600 font-medium">Connecting HubSpot…</p>
      </div>
    </div>
  );
}
