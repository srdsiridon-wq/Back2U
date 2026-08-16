import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import logoAsset from "@/assets/back2u-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — Back2U" },
      {
        name: "description",
        content: "เข้าสู่ระบบ Back2U เพื่อแจ้งของหาย แจ้งของที่เก็บได้ และติดตามคำขอรับคืนของคุณ",
      },
      { property: "og:title", content: "เข้าสู่ระบบ — Back2U" },
      {
        property: "og:description",
        content: "เข้าสู่ระบบเพื่อแจ้งของหายและติดตามคำขอรับคืนบน Back2U",
      },
    ],
  }),
  component: AuthPage,
});

function safePath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const target = safePath(redirect);

  useEffect(() => {
    if (!loading && session) navigate({ to: target, replace: true });
  }, [loading, session, navigate, target]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${target}`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("สมัครสมาชิกแล้ว — ตรวจอีเมลเพื่อยืนยันตัวตน");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target, replace: true });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      sessionStorage.setItem("back2u:redirect", target);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
        return;
      }
      if (result.redirected) return;
      navigate({ to: target, replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pb-10 pt-8">
      <img src={logoAsset.url} alt="Back2U" width={320} height={320} className="mx-auto h-24 w-auto" />
      <h1 className="mt-4 text-center text-2xl">
        {mode === "signin" ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
      </h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">
        ใช้บัญชีนักเรียนเพื่อแจ้งของและติดตามคำขอรับคืน
      </p>

      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={busy}
        onClick={handleGoogle}
        className="mt-6 h-12 w-full rounded-xl text-base"
      >
        เข้าสู่ระบบด้วย Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        หรือใช้อีเมล
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <div className="space-y-1">
            <Label htmlFor="name" className="text-sm">ชื่อที่แสดง</Label>
            <Input id="name" name="name" required placeholder="เช่น มินา ม.4" className="h-11 rounded-xl" />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm">อีเมล</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="student@school.ac.th"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password" className="text-sm">รหัสผ่าน</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            className="h-11 rounded-xl"
          />
        </div>
        <Button type="submit" size="lg" disabled={busy} className="h-12 w-full rounded-xl text-base">
          {mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode((value) => (value === "signin" ? "signup" : "signin"))}
        className="mt-4 w-full text-center text-sm font-medium text-primary"
      >
        {mode === "signin" ? "ยังไม่มีบัญชี? สมัครใช้งาน" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
      </button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        ค้นหาของได้โดยไม่ต้องเข้าสู่ระบบ —{" "}
        <Link to="/search" search={{ q: undefined }} className="text-primary">
          ไปหน้าค้นหา
        </Link>
      </p>
    </div>
  );
}
