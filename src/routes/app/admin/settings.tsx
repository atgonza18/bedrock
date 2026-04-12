import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Upload, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const settings = useQuery(api.orgSettings.getSettings);

  if (settings === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Organization Branding</CardTitle>
              <CardDescription>
                Customize your organization&rsquo;s logo, display name, and brand
                color.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <LogoSection
            logoUrl={settings.logoUrl ?? null}
            logoStorageId={settings.logoStorageId ?? null}
          />
          <DisplayNameSection displayName={settings.displayName} />
          <PrimaryColorSection primaryColor={settings.primaryColor ?? "#d97706"} />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Logo upload ─────────────────────────────────────────────────────────────

function LogoSection({
  logoUrl,
  logoStorageId,
}: {
  logoUrl: string | null;
  logoStorageId: Id<"_storage"> | null | undefined;
}) {
  const generateUploadUrl = useMutation(api.orgSettings.generateUploadUrl);
  const updateBranding = useMutation(api.orgSettings.updateBranding);
  const removeLogo = useMutation(api.orgSettings.removeLogo);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      await updateBranding({ logoStorageId: storageId });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Logo</Label>

      {logoUrl ? (
        <div className="flex items-center gap-4">
          <div className="rounded-md border p-2 bg-muted/30">
            <img
              src={logoUrl}
              alt="Organization logo"
              className="max-h-20 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void removeLogo({})}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-sm rounded-lg border-2 border-dashed border-muted-foreground/25 py-10 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {uploading ? "Uploading..." : "Click to upload a logo"}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            PNG, JPG, or SVG recommended
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files)}
      />
    </div>
  );
}

// ─── Display name ────────────────────────────────────────────────────────────

function DisplayNameSection({ displayName }: { displayName: string }) {
  const updateBranding = useMutation(api.orgSettings.updateBranding);
  const [value, setValue] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const isDirty = value !== displayName;

  const handleSave = async () => {
    if (!isDirty || !value.trim()) return;
    setSaving(true);
    try {
      await updateBranding({ displayName: value.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="displayName" className="text-sm font-medium">
        Display Name
      </Label>
      <div className="flex gap-2">
        <Input
          id="displayName"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your organization name"
        />
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || !value.trim() || saving}
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── Primary color ───────────────────────────────────────────────────────────

function PrimaryColorSection({ primaryColor }: { primaryColor: string }) {
  const updateBranding = useMutation(api.orgSettings.updateBranding);
  const [value, setValue] = useState(primaryColor);
  const [saving, setSaving] = useState(false);
  const isDirty = value !== primaryColor;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await updateBranding({ primaryColor: value });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 max-w-sm">
      <Label htmlFor="primaryColor" className="text-sm font-medium">
        Primary Color
      </Label>
      <div className="flex items-center gap-3">
        <input
          id="primaryColor"
          type="color"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-input p-1"
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28 font-mono text-sm"
          placeholder="#d97706"
        />
        <Button
          type="button"
          size="sm"
          disabled={!isDirty || saving}
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
