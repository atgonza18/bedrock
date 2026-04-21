import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentMember } from "@/features/auth/useCurrentMember";
import { useSetBreadcrumbs } from "@/components/layout/breadcrumb-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SignaturePad } from "@/features/queue/SignaturePad";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, Save, PenLine } from "lucide-react";
import { PageTransition } from "@/components/layout/PageTransition";
import { PushSettings } from "@/features/notifications/PushSettings";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const me = useCurrentMember();
  const assets = useQuery(api.users.getMyProfileAssets);
  const updateProfile = useMutation(api.users.updateProfile);
  const clearAsset = useMutation(api.users.clearProfileAsset);
  const generateUrl = useMutation(api.users.generateProfileUploadUrl);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [peLicense, setPeLicense] = useState("");
  const [peStatesText, setPeStatesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"signature" | "seal" | null>(null);
  const [drawingSignature, setDrawingSignature] = useState(false);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  useSetBreadcrumbs([{ label: "Profile" }]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (me?.state !== "ok" && me?.state !== "no_org") return;
    hydratedRef.current = true;
    setFullName(me.profile.fullName ?? "");
    setPhone(me.profile.phone ?? "");
    setPeLicense(me.profile.peLicenseNumber ?? "");
    setPeStatesText((me.profile.peStates ?? []).join(", "));
  }, [me]);

  if (me === undefined || assets === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (me.state !== "ok" && me.state !== "no_org") {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const states = peStatesText
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);
      await updateProfile({
        fullName: fullName.trim(),
        phone,
        peLicenseNumber: peLicense,
        peStates: states,
      });
      toast.success("Profile saved");
    } finally {
      setSaving(false);
    }
  };

  const uploadBlob = async (blob: Blob, contentType: string) => {
    const url = await generateUrl({});
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };

  const saveDrawnSignature = async () => {
    if (!drawnSignature) return;
    setUploading("signature");
    try {
      const res = await fetch(drawnSignature);
      const blob = await res.blob();
      const storageId = await uploadBlob(blob, "image/png");
      await updateProfile({ signatureStorageId: storageId });
      toast.success("Signature saved");
      setDrawingSignature(false);
      setDrawnSignature(null);
    } finally {
      setUploading(null);
    }
  };

  const uploadSealFile = async (file: File) => {
    setUploading("seal");
    try {
      const storageId = await uploadBlob(file, file.type);
      await updateProfile({ sealStorageId: storageId });
      toast.success("PE seal uploaded");
    } finally {
      setUploading(null);
      if (sealInputRef.current) sealInputRef.current.value = "";
    }
  };

  const removeSignature = async () => {
    await clearAsset({ field: "signature" });
    toast.success("Signature removed");
  };

  const removeSeal = async () => {
    await clearAsset({ field: "seal" });
    toast.success("PE seal removed");
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 space-y-8" data-stagger>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Your profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Name, contact info, and your reusable signature + PE seal.
          </p>
        </div>

        {/* Basic info */}
        <Card>
          <CardContent className="py-5 space-y-4">
            <SectionHead>Basic info</SectionHead>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-0100"
                />
              </div>
            </div>
            <div className="pt-1 flex justify-end">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Signature on file */}
        <Card>
          <CardContent className="py-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionHead>Signature on file</SectionHead>
                <p className="text-sm text-muted-foreground mt-1">
                  Used automatically when you approve a report. You can still
                  draw fresh if you prefer.
                </p>
              </div>
              {assets?.signatureUrl && !drawingSignature && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void removeSignature()}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>
            {drawingSignature ? (
              <div className="space-y-3">
                <SignaturePad onCapture={setDrawnSignature} />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDrawingSignature(false);
                      setDrawnSignature(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!drawnSignature || uploading === "signature"}
                    onClick={() => void saveDrawnSignature()}
                  >
                    {uploading === "signature" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save signature
                  </Button>
                </div>
              </div>
            ) : assets?.signatureUrl ? (
              <div className="flex items-center gap-4">
                <div className="border border-border/70 rounded-sm bg-background p-3">
                  <img
                    src={assets.signatureUrl}
                    alt="Your signature"
                    className="h-14 w-auto"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawingSignature(true)}
                >
                  <PenLine className="size-3.5" />
                  Replace
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <p className="text-sm text-muted-foreground flex-1">
                  No signature on file yet. Draw one and reuse it on every
                  approval.
                </p>
                <Button size="sm" onClick={() => setDrawingSignature(true)}>
                  <PenLine className="size-3.5" />
                  Draw signature
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PE seal + license */}
        <Card>
          <CardContent className="py-5 space-y-4">
            <div>
              <SectionHead>PE license &amp; seal</SectionHead>
              <p className="text-sm text-muted-foreground mt-1">
                Stamped reports require a PE seal in many states. Upload once,
                applied on every approval.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>PE license number</Label>
                <Input
                  value={peLicense}
                  onChange={(e) => setPeLicense(e.target.value)}
                  placeholder="e.g. 0123456"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Licensed states{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    two-letter codes, comma-separated
                  </span>
                </Label>
                <Input
                  value={peStatesText}
                  onChange={(e) => setPeStatesText(e.target.value)}
                  placeholder="AL, GA, FL"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <Button
                variant="outline"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save PE details
              </Button>
            </div>

            <div className="border-t border-border/70 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Label>Seal image</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PNG or JPEG. Transparent PNG recommended.
                  </p>
                </div>
                {assets?.sealUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeSeal()}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <div className="mt-3">
                <input
                  ref={sealInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadSealFile(f);
                  }}
                />
                {assets?.sealUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="border border-border/70 rounded-sm bg-background p-3">
                      <img
                        src={assets.sealUrl}
                        alt="Your PE seal"
                        className="h-20 w-auto"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sealInputRef.current?.click()}
                      disabled={uploading === "seal"}
                    >
                      {uploading === "seal" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      Replace
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sealInputRef.current?.click()}
                    disabled={uploading === "seal"}
                  >
                    {uploading === "seal" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    Upload seal
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <PushSettings />
      </div>
    </PageTransition>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-heading font-semibold tracking-tight">{children}</h2>
  );
}
