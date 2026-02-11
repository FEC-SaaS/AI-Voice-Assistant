"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Paintbrush,
  Image,
  Loader2,
  Save,
  Upload,
  X,
  Bot,
  Crown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import { canHidePoweredBy } from "@/lib/plan-features";
import Link from "next/link";

export default function BrandingSettingsPage() {
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandFaviconUrl, setBrandFaviconUrl] = useState<string | null>(null);
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("");
  const [brandAccentColor, setBrandAccentColor] = useState("");
  const [poweredByHidden, setPoweredByHidden] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  const { data: branding, isLoading } =
    trpc.organization.getBranding.useQuery();

  const utils = trpc.useUtils();

  const updateBranding = trpc.organization.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("Branding settings saved");
      setHasChanges(false);
      utils.organization.getBranding.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Hydrate form from fetched data
  useEffect(() => {
    if (branding) {
      setBrandName(branding.brandName || "");
      setBrandLogoUrl(branding.brandLogoUrl);
      setBrandFaviconUrl(branding.brandFaviconUrl);
      setBrandPrimaryColor(branding.brandPrimaryColor || "");
      setBrandAccentColor(branding.brandAccentColor || "");
      setPoweredByHidden(branding.poweredByHidden);
    }
  }, [branding]);

  const uploadFile = async (
    file: File,
    setUploading: (v: boolean) => void
  ): Promise<string | null> => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/branding", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return null;
      }
      return data.url;
    } catch {
      toast.error("Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onLogoDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const url = await uploadFile(file, setUploadingLogo);
      if (url) {
        setBrandLogoUrl(url);
        setHasChanges(true);
      }
    },
    []
  );

  const onFaviconDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const url = await uploadFile(file, setUploadingFavicon);
      if (url) {
        setBrandFaviconUrl(url);
        setHasChanges(true);
      }
    },
    []
  );

  const logoDropzone = useDropzone({
    onDrop: onLogoDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/svg+xml": [".svg"],
    },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024,
  });

  const faviconDropzone = useDropzone({
    onDrop: onFaviconDrop,
    accept: {
      "image/png": [".png"],
      "image/x-icon": [".ico"],
      "image/svg+xml": [".svg"],
    },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024,
  });

  const handleSave = () => {
    updateBranding.mutate({
      brandName: brandName || undefined,
      brandLogoUrl: brandLogoUrl,
      brandFaviconUrl: brandFaviconUrl,
      brandPrimaryColor: brandPrimaryColor || null,
      brandAccentColor: brandAccentColor || null,
      poweredByHidden,
    });
  };

  const markChanged = () => setHasChanges(true);

  const planAllowsHide = branding ? canHidePoweredBy(branding.planId) : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Branding Settings
          </h1>
          <p className="text-muted-foreground">
            Customize your dashboard appearance, logos, and colors
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateBranding.isPending}
        >
          {updateBranding.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Brand Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Brand Name
          </CardTitle>
          <CardDescription>
            This name replaces &quot;CallTone&quot; throughout the dashboard and
            public pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brandName">Display Name</Label>
            <Input
              id="brandName"
              placeholder="Your Brand Name"
              value={brandName}
              onChange={(e) => {
                setBrandName(e.target.value);
                markChanged();
              }}
            />
            <p className="text-sm text-muted-foreground">
              Leave as your organization name or enter a custom brand name.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo & Favicon
          </CardTitle>
          <CardDescription>
            Upload your brand logo and favicon. Supported: PNG, JPG, SVG. Max
            2MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Brand Logo</Label>
            {brandLogoUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-40 rounded-lg border bg-secondary flex items-center justify-center p-2">
                  <img
                    src={brandLogoUrl}
                    alt="Brand logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBrandLogoUrl(null);
                    markChanged();
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : (
              <div
                {...logoDropzone.getRootProps()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50"
              >
                <input {...logoDropzone.getInputProps()} />
                {uploadingLogo ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/70" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drop your logo here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Recommended: 200x50px, PNG or SVG
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Favicon */}
          <div className="space-y-2">
            <Label>Favicon</Label>
            {brandFaviconUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative h-10 w-10 rounded-lg border bg-secondary flex items-center justify-center p-1">
                  <img
                    src={brandFaviconUrl}
                    alt="Favicon"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBrandFaviconUrl(null);
                    markChanged();
                  }}
                >
                  <X className="mr-1 h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : (
              <div
                {...faviconDropzone.getRootProps()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50"
              >
                <input {...faviconDropzone.getInputProps()} />
                {uploadingFavicon ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground/70" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drop favicon here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      32x32px, PNG or ICO
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Customize primary and accent colors for your dashboard theme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="brandPrimaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="brandPrimaryColor"
                  type="color"
                  className="w-16 h-10 p-1 cursor-pointer"
                  value={brandPrimaryColor || "#1e293b"}
                  onChange={(e) => {
                    setBrandPrimaryColor(e.target.value);
                    markChanged();
                  }}
                />
                <Input
                  value={brandPrimaryColor}
                  onChange={(e) => {
                    setBrandPrimaryColor(e.target.value);
                    markChanged();
                  }}
                  className="w-32"
                  placeholder="#1e293b"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for buttons, links, sidebar highlights
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandAccentColor">Accent Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="brandAccentColor"
                  type="color"
                  className="w-16 h-10 p-1 cursor-pointer"
                  value={brandAccentColor || "#f1f5f9"}
                  onChange={(e) => {
                    setBrandAccentColor(e.target.value);
                    markChanged();
                  }}
                />
                <Input
                  value={brandAccentColor}
                  onChange={(e) => {
                    setBrandAccentColor(e.target.value);
                    markChanged();
                  }}
                  className="w-32"
                  placeholder="#f1f5f9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Used for hover states and secondary elements
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            Preview how your sidebar will look with the current branding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-64 rounded-lg border bg-card overflow-hidden shadow-sm">
            {/* Mock sidebar header */}
            <div className="flex h-14 items-center gap-3 border-b px-4">
              {brandLogoUrl ? (
                <img
                  src={brandLogoUrl}
                  alt="Logo"
                  className="h-8 max-w-[120px] object-contain"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{
                    backgroundColor: brandPrimaryColor || "#1e293b",
                  }}
                >
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <span className="text-sm font-bold text-foreground">
                {brandName || "CallTone"}
              </span>
            </div>

            {/* Mock nav items */}
            <div className="p-2 space-y-1">
              <div
                className="rounded-lg px-3 py-2 text-xs text-white"
                style={{
                  backgroundColor: brandPrimaryColor || "#1e293b",
                }}
              >
                Dashboard
              </div>
              <div className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">
                Agents
              </div>
              <div className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary">
                Campaigns
              </div>
            </div>

            {/* Powered by footer */}
            {!poweredByHidden && (
              <div className="border-t px-4 py-2">
                <p className="text-[10px] text-muted-foreground/70 text-center">
                  Powered by CallTone
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Powered By Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            White-Label Branding
          </CardTitle>
          <CardDescription>
            Remove &quot;Powered by CallTone&quot; from the sidebar and
            public pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {planAllowsHide ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Hide &quot;Powered by CallTone&quot;
                </p>
                <p className="text-sm text-muted-foreground">
                  Removes branding from sidebar footer and appointment pages
                </p>
              </div>
              <Switch
                checked={poweredByHidden}
                onCheckedChange={(checked) => {
                  setPoweredByHidden(checked);
                  markChanged();
                }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-400">
                    Business Plan Required
                  </p>
                  <p className="text-sm text-amber-400 mt-1">
                    Upgrade to the Business plan or higher to remove
                    &quot;Powered by CallTone&quot; branding from your
                    dashboard and public pages.
                  </p>
                  <Link href="/dashboard/settings/billing">
                    <Button variant="outline" size="sm" className="mt-3">
                      Upgrade Plan
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
