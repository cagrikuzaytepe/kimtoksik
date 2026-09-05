"use client";

import { useState, useCallback, useRef } from "react";
import JSZip from "jszip";

interface FileUploadProps {
  onUpload: (content: string) => void;
}

const MAX_SIZE = 5 * 1024 * 1024;

async function extractTextFromZip(zipFile: File): Promise<string> {
  const zip = await JSZip.loadAsync(zipFile);
  // once _chat.txt dogrudan aranir
  let entry = zip.file("_chat.txt");
  if (!entry) {
    // yoksa kokteki ya da _chat.txt ile biten dosyayi bul
    const candidates = Object.keys(zip.files).filter(
      (name) =>
        !name.endsWith("/") &&
        (name.endsWith("_chat.txt") ||
          name.endsWith(".txt") &&
            name.split("/").length === 2)
    );
    if (!candidates.length) {
      // son care: herhangi bir .txt
      const anyTxt = Object.keys(zip.files).filter(
        (name) => !name.endsWith("/") && name.endsWith(".txt")
      );
      if (!anyTxt.length) {
        throw new Error("zip icinde sohbet dosyasi bulunamadi");
      }
      candidates.push(anyTxt[0]);
    }
    entry = zip.file(candidates[0]);
  }
  if (!entry) {
    throw new Error("zip icinde sohbet dosyasi bulunamadi");
  }
  return entry.async("string");
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const isTxt = file.name.endsWith(".txt");
      const isZip = file.name.endsWith(".zip");

      if (!isTxt && !isZip) {
        setError("sadece .txt veya .zip dosyalari kabul ediliyor");
        return;
      }

      if (file.size > MAX_SIZE) {
        setError("dosya 5MB'dan kucuk olmali");
        return;
      }

      setIsLoading(true);
      setError(null);
      setFileName(file.name);

      try {
        let content: string;
        if (isZip) {
          content = await extractTextFromZip(file);
        } else {
          content = await file.text();
        }

        if (content.trim().length < 50) {
          setError("dosya cok kucuk. whatsapp sohbeti mi yukledin?");
          return;
        }
        onUpload(content);
      } catch {
        setError("zip acilamadi. gecerli bir whatsapp sohbet zipi olmali");
      } finally {
        setIsLoading(false);
        setFileName(null);
      }
    },
    [onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClick = () => fileInputRef.current?.click();

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-12
          transition-all duration-300 text-center
          ${
            isDragging
              ? "border-accent bg-accent/5 scale-[1.02]"
              : "border-muted/30 hover:border-accent/50 hover:bg-surface/50"
          }
          ${isLoading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.zip"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-muted">{fileName}</p>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface border border-surface-light flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              </svg>
            </div>
          )}

          <div>
            <p className="text-lg font-semibold">
              {isLoading
                ? "zip aciliyor..."
                : "sohbeti buraya surukle birak"}
            </p>
            <p className="text-sm text-muted mt-1">
              ya da tikla, dosya sec (.txt veya .zip)
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted">
            <span className="px-2 py-1 rounded-full bg-surface border border-surface-light">
              guvenli
            </span>
            <span className="px-2 py-1 rounded-full bg-surface border border-surface-light">
              saklanmiyor
            </span>
            <span className="px-2 py-1 rounded-full bg-surface border border-surface-light">
              zip destekleniyor
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center">
          {error}
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl bg-surface/50 border border-surface-light">
        <p className="text-sm font-medium mb-2 text-muted">
          nasil yuklenir?
        </p>
        <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
          <li>whatsapp&apos;ta sohbeti ac</li>
          <li>ustteki isme tikla &rarr; &quot;sohbeti disa aktar&quot;</li>
          <li>
            &quot;medya olmadan&quot; sec, zip olarak inse de sorun degil
          </li>
          <li>cikan .txt ya da .zip dosyasini buraya yukle</li>
        </ol>
      </div>
    </div>
  );
}