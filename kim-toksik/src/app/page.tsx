import type { Metadata } from "next";
import Home from "@/components/Home";

export const metadata: Metadata = {
  title: {
    absolute:
      "kim toksik — whatsapp toksiklik testi, kim kimi darlıyor",
  },
  description:
    "WhatsApp sohbetini yükle, kim toksik öğren. Yapay zeka ile ücretsiz toksiklik testi: toksiklik skoru, red flagler, kim kimi darlıyor, kim haklı.",
  keywords: [
    "kim toksik",
    "toksik testi",
    "toksiklik testi",
    "whatsapp toksiklik testi",
    "whatsapp ilişki analizi",
    "red flag testi",
    "toksik ilişki testi",
    "toksik sevgili testi",
    "ilişki analizi",
    "kim kimi darlıyor",
  ],
  alternates: {
    canonical: "/",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "kim toksik nedir?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "kim toksik, WhatsApp sohbetini yükleyip yapay zeka ile ilişkinizi analiz eden ücretsiz bir toksiklik testidir. Toksiklik skoru, red flagler, kim kimi darlıyor ve kimin haklı olduğunu otomatik olarak tespit eder.",
      },
    },
    {
      "@type": "Question",
      name: "toksiklik testi nasıl yapılır?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "WhatsApp'ta sohbeti açın, kişi adına tıklayın, 'sohbeti dışa aktar' deyin ve 'medya olmadan' seçeneğiyle .txt dosyasını indirin. Ardından dosyayı kimtoksik.lol sayfasına sürükleyip bırakın — analiz birkaç saniye sürer.",
      },
    },
    {
      "@type": "Question",
      name: "whatsapp sohbetim güvende mi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Evet. Yüklediğiniz sohbet yalnızca analiz için kullanılır, başka kimseyle paylaşılmaz. Kişisel mesajlar arama sonuçlarına dahil edilmez ve anonim olarak saklanır.",
      },
    },
    {
      "@type": "Question",
      name: "toksiklik skoru nasıl hesaplanıyor?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yapay zeka; mesaj uzunlukları, geç saatte atılan mesajlar, hakaret ve aşağılama kalıpları, kimin kimi beklettiği gibi ipuçlarını tarayarak 0-100 arası bir toksiklik skoru üretir. 0 çok sağlıklı, 100 çok toksik anlamına gelir.",
      },
    },
    {
      "@type": "Question",
      name: "raporum ne kadar sürede hazır?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sohbetin boyutuna göre genellikle 3-5 saniye içinde hazır olur. Rapor, size özel bağlantısıyla hemen paylaşılabilir.",
      },
    },
    {
      "@type": "Question",
      name: "kim toksik ücretsiz mi?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Evet, kim toksik tamamen ücretsiz bir whatsapp ilişki analizi aracıdır. Üyelik, indirme veya ödeme gerektirmez.",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Home />
    </>
  );
}