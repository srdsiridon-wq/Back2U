import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Home, ImagePlus, LogIn, Search, SquarePlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { BUILDINGS } from "@/lib/back2u/data";
import { categoryTh, colorTh } from "@/lib/back2u/i18n";
import { createReport } from "@/lib/back2u/items.functions";
import { useItems } from "@/lib/back2u/store";
import { CATEGORIES, COLORS, type ItemStatus } from "@/lib/back2u/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FLOORS = ["ชั้น 1", "ชั้น 2", "ชั้น 3", "กลางแจ้ง"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const selectClass =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function defaultDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function ReportForm({ status }: { status: ItemStatus }) {
  const navigate = useNavigate();
  const { refresh } = useItems();
  const { user, loading } = useSession();
  const submitReport = useServerFn(createReport);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);


  const isFound = status === "found";
  const redirectTo = isFound ? "/report/found" : "/report/lost";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    const data = new FormData(event.currentTarget);
    const room = String(data.get("room") ?? "").trim();
    setBusy(true);

    try {
      const storagePaths: string[] = [];
      for (const picked of files) {
        const ext = picked.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("item-images").upload(path, picked, {
          contentType: picked.type,
          upsert: false,
        });
        if (error) throw error;
        storagePaths.push(path);
      }

      const result = await submitReport({
        data: {
          kind: status,
          title: String(data.get("name") ?? "").trim(),
          description: String(data.get("description") ?? "").trim(),
          category: String(data.get("category")) as (typeof CATEGORIES)[number],
          color: String(data.get("color")) as (typeof COLORS)[number],
          building: String(data.get("building")) as "main",
          floor: String(data.get("floor")),
          ...(room ? { room } : {}),
          occurredAt: String(data.get("date")),
          ...(storagePaths.length ? { storagePaths } : {}),
        },
      });

      refresh();
      setSubmittedId(result.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ส่งข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
          <LogIn className="h-7 w-7 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-bold">เข้าสู่ระบบเพื่อแจ้งรายการ</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          เราต้องรู้ว่าใครเป็นคนแจ้ง เพื่อให้ติดตามและส่งของคืนเจ้าของได้ถูกคน
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button asChild size="lg" className="h-12 rounded-xl text-base">
            <Link to="/auth" search={{ redirect: redirectTo }}>
              เข้าสู่ระบบ / สมัครใช้งาน
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="h-12 rounded-xl text-base">
            <Link to="/search" search={{ q: undefined }}>
              ค้นหาของโดยไม่เข้าสู่ระบบ
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (submittedId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">
          {isFound ? "ขอบคุณที่ช่วยส่งของคืนเจ้าของ" : "แจ้งของหายเรียบร้อยแล้ว"}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          {isFound
            ? "ของที่คุณเก็บได้ถูกบันทึกให้ค้นหาเจอแล้ว รบกวนนำไปฝากที่ห้องธุรการเพื่อให้เจ้าของมารับคืน"
            : "เราบันทึกคำแจ้งของคุณแล้ว ลองค้นหาดูตอนนี้ เผื่อมีคนเก็บของคล้าย ๆ กันมาส่งคืนไว้"}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {isFound ? (
            <Button asChild size="lg" className="h-12 rounded-xl text-base">
              <Link to="/item/$itemId" params={{ itemId: submittedId }} search={{ q: undefined }}>
                <SquarePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                ดูรายการที่แจ้ง
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="h-12 rounded-xl text-base">
                <Link to="/item/$itemId" params={{ itemId: submittedId }} search={{ q: undefined }}>
                  <SquarePlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  ดูรายการที่แจ้ง
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl text-base">
                <Link to="/search" search={{ q: undefined }}>
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  ค้นหารายการที่ตรงกัน
                </Link>
              </Button>
            </>
          )}

          <Button asChild size="lg" variant="outline" className="h-12 rounded-xl text-base">
            <Link to="/me">
              ดูรายการของฉัน
            </Link>
          </Button>

          <Button asChild size="lg" variant="ghost" className="h-12 rounded-xl text-base">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              กลับหน้าแรก
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="name" className="text-sm">ชื่อของ</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="เช่น กระเป๋าดินสอสีน้ำเงิน"
          className="h-10 rounded-xl"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="category" className="text-sm">หมวดหมู่</Label>
          <select id="category" name="category" className={selectClass} defaultValue="Stationery">
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryTh(category)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="color" className="text-sm">สี</Label>
          <select id="color" name="color" className={selectClass} defaultValue="Blue">
            {COLORS.map((color) => (
              <option key={color} value={color}>
                {colorTh(color)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="description" className="text-sm">รายละเอียด</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={2}
          placeholder="เช่น มีสติกเกอร์แมว ซิปสีขาว มีชื่อเขียนไว้"
          className="rounded-xl"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="building" className="text-sm">
            {isFound ? "เก็บได้ที่ไหน" : "เห็นครั้งสุดท้ายที่ไหน"}
          </Label>
          <select id="building" name="building" className={selectClass} defaultValue="science">
            {BUILDINGS.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="floor" className="text-sm">ชั้น</Label>
          <select id="floor" name="floor" className={selectClass} defaultValue="ชั้น 1">
            {FLOORS.map((floor) => (
              <option key={floor} value={floor}>
                {floor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFound && (
        <div className="space-y-1">
          <Label htmlFor="room" className="text-sm">ห้อง (ถ้ามี)</Label>
          <Input id="room" name="room" placeholder="เช่น ห้อง 204" className="h-10 rounded-xl" />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="date" className="text-sm">วันและเวลา</Label>
        <Input
          id="date"
          name="date"
          type="datetime-local"
          defaultValue={defaultDateTime()}
          className="h-10 rounded-xl"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="image" className="text-sm">รูปภาพ (ถ้ามี • สูงสุด 4 รูป)</Label>
        <label
          htmlFor="image"
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-card p-2 text-sm text-muted-foreground"
        >
          {previews.length ? (
            <span className="flex gap-1.5">
              {previews.map((src) => (
                <img key={src} src={src} alt="รูปของที่เลือก" className="h-10 w-10 rounded-lg object-cover" />
              ))}
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <span className="flex-1 text-xs">
            {previews.length
              ? `เลือกแล้ว ${previews.length} รูป — แตะเพื่อเปลี่ยน`
              : "เพิ่มรูปเพื่อให้ระบุของได้ง่ายขึ้น (ไฟล์ละไม่เกิน 5 MB)"}
          </span>
        </label>
        <input
          id="image"
          name="image"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            if (!picked.length) return;
            const valid = picked.filter((entry) => {
              if (!ALLOWED_TYPES.includes(entry.type)) {
                toast.error("รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP");
                return false;
              }
              if (entry.size > MAX_IMAGE_BYTES) {
                toast.error(`ไฟล์ ${entry.name} ใหญ่เกิน 5 MB`);
                return false;
              }
              return true;
            });
            if (!valid.length) return;
            if (picked.length > 4) toast.info("ใช้ได้สูงสุด 4 รูป");
            const capped = valid.slice(0, 4);
            setFiles(capped);
            setPreviews(capped.map((entry) => URL.createObjectURL(entry)));
          }}
        />
      </div>


      <div className="flex flex-col gap-1.5 pt-1">
        <Button type="submit" size="lg" disabled={busy} className="h-10 rounded-xl text-base">
          {busy ? "กำลังส่ง…" : isFound ? "ส่งข้อมูลของที่เก็บได้" : "ส่งคำแจ้งของหาย"}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          className="h-10 rounded-xl"
          onClick={() => navigate({ to: "/report" })}
        >
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
