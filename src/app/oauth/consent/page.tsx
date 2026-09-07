"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ConsentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const clientId = params.get("client_id") || "pnk-mail";
  const redirectUri =
    params.get("redirect_uri") || "http://localhost:3000/oauth/callback";
  const scope = params.get("scope") || "openid profile email phone";
  const state = params.get("state") || "";

  const [client, setClient] = useState<{
    name: string;
    description: string | null;
    scopes: string[];
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      if (!(await me.json()).ok) {
        router.replace(
          `/login?service=${encodeURIComponent(clientId)}&next=${encodeURIComponent(
            `/oauth/consent?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`,
          )}`,
        );
        return;
      }
      const res = await fetch(
        `/api/oauth/authorize?client_id=${encodeURIComponent(clientId)}`,
      );
      const json = await res.json();
      if (json.ok) setClient(json.data);
      else setError(json.error?.message || "Клиент не найден");
    })();
  }, [clientId, redirectUri, scope, state, router]);

  async function decide(approve: boolean) {
    const res = await fetch("/api/oauth/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state,
        approve,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      setError(json.error?.message || "Ошибка");
      return;
    }
    // For local mail not running yet — show code
    if (json.data.redirect?.startsWith("http://localhost:3000")) {
      alert(
        `Authorization code выдан.\n\nredirect:\n${json.data.redirect}\n\nСкопируйте code из URL для обмена на token.`,
      );
      router.push("/cabinet");
      return;
    }
    window.location.href = json.data.redirect;
  }

  return (
    <div className="min-h-dvh bg-[#0c0d10] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-[440px] rounded-[24px] bg-[#1a1c22] p-6">
        <p className="text-sm text-white/40 mb-2">pnk ID · доступ приложению</p>
        <h1 className="text-2xl font-semibold mb-2">
          {client?.name || "Приложение"}
        </h1>
        <p className="text-sm text-white/50 mb-6">
          {client?.description || "Запрашивает доступ к вашему профилю pnk ID"}
        </p>
        <ul className="text-sm text-white/70 space-y-1 mb-6 list-disc pl-5">
          {(client?.scopes || scope.split("")).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide(false)}
            className="flex-1 h-12 rounded-[12px] bg-white/10"
          >
            Отклонить
          </button>
          <button
            type="button"
            onClick={() => decide(true)}
            className="flex-1 h-12 rounded-[12px] bg-[#0066ff] font-semibold"
          >
            Разрешить
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0c0d10]" />}>
      <ConsentInner />
    </Suspense>
  );
}
