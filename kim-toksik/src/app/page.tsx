"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const handleUpload = async (content: string, _fileName: string) => {
    setIsLoading(true);
    setError(null);
    setProgress("sohbet okunuyor...");

    try {
      const response = await fetch("/api/analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "analiz basarisiz oldu");
      }

      setProgress("rapor hazirlaniyor...");
      const data = await response.json();

      sessionStorage.setItem(`report-${data.id}`, JSON.stringify(data));
      router.push(`/analiz/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "bilinmeyen bir hata olustu"
      );
    } finally {
      setIsLoading(false);
      setProgress("");
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
            kim<span className="text-accent">toksik</span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-md mx-auto leading-relaxed">
            whatsapp sohbetini yukle, kim toksik ogren.
            <br />
            <span className="text-sm text-muted/70">
              red flagler, kim kimi darliyor, kim hakli - hepsi burada.
            </span>
          </p>
        </div>

        <div className="w-full max-w-xl animate-fade-in-up animation-delay-200">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <p className="text-lg font-medium">{progress}</p>
              <p className="text-sm text-muted mt-2">cozuyoruz...</p>
            </div>
          ) : (
            <FileUpload onUpload={handleUpload} />
          )}

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm text-center">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 w-full max-w-3xl animate-fade-in-up animation-delay-400">
          <div className="p-5 rounded-xl bg-surface border border-surface-light text-center card-hover">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-accent text-xl font-bold">0-100</span>
            </div>
            <h3 className="font-semibold mb-1 text-sm">Toksiklik Skoru</h3>
            <p className="text-xs text-muted">
              iliskin ne kadar saglikli sayilar konusuyor
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-surface-light text-center card-hover">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-warning text-xl font-bold">!</span>
            </div>
            <h3 className="font-semibold mb-1 text-sm">Red Flagler</h3>
            <p className="text-xs text-muted">
              gozden kacan tehlike isaretleri otomatik tespit
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-surface-light text-center card-hover">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-success text-xl font-bold">/</span>
            </div>
            <h3 className="font-semibold mb-1 text-sm">Son Soz</h3>
            <p className="text-xs text-muted">
              kim hakli kim haksiz nihai karar burada
            </p>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-surface-light">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-accent">12k+</p>
              <p className="text-xs text-muted mt-1">sohbet analiz edildi</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-warning">67</p>
              <p className="text-xs text-muted mt-1">ortalama toksiklik</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-success">4.2s</p>
              <p className="text-xs text-muted mt-1">ortalama sure</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-surface/50 border-t border-surface-light">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-xl font-bold text-center mb-8">
            nasil calisiyor?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                1
              </div>
              <h3 className="font-medium text-sm mb-1">sohbeti disa aktar</h3>
              <p className="text-xs text-muted">
                whatsapp &rarr; sohbet &rarr; medya olmadan disa aktar
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                2
              </div>
              <h3 className="font-medium text-sm mb-1">yukle</h3>
              <p className="text-xs text-muted">
                .txt dosyasini surukle birak
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                3
              </div>
              <h3 className="font-medium text-sm mb-1">sonucu gor</h3>
              <p className="text-xs text-muted">
                yapay zeka her seyi cozdu
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-muted/50 border-t border-surface-light">
        kim toksik &mdash; verileriniz guvenle islenir, saklanmaz
      </footer>
    </main>
  );
}
