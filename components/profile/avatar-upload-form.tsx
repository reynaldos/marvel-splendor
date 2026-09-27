"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  username: string;
  avatarUrl: string | null;
};

export function AvatarUploadForm({ username, avatarUrl }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(avatarUrl);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      setError("Please choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Image must be smaller than ${Math.floor(MAX_BYTES / 1024 / 1024)}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const requestRes = await fetch("/api/avatar/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
      });
      if (!requestRes.ok) {
        const body = await requestRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not start the upload.");
      }
      const { key, uploadUrl } = await requestRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error("Upload to storage failed.");
      }

      const confirmRes = await fetch("/api/avatar/upload", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!confirmRes.ok) {
        const body = await confirmRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not confirm the upload.");
      }

      setPreviewUrl(URL.createObjectURL(file));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        {previewUrl ? <AvatarImage src={previewUrl} alt={username} /> : null}
        <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_CONTENT_TYPES.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Uploading…" : "Change avatar"}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP — up to 2MB.</p>
      </div>
    </div>
  );
}
