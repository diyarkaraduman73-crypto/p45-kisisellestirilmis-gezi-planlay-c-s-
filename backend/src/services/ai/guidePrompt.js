// İSTEM (PROMPT) TASARIMI: Kişisel gezi rehberi
//
// Yaklaşım: Yapay zekâ planı SIFIRDAN üretmez. Saatleri, sırayı ve mesafeleri bizim deterministik
// algoritmamız (planner.js) hesaplar — bunlar doğrulanabilir ve kısıtlara uyar. Yapay zekâya yalnızca
// dilin iyi olduğu iş verilir: planı kişinin ilgi alanlarına göre anlatmak, durak başına ipucu yazmak ve
// VERİLEN aday listesinden yerel öneri seçmek. Böylece "gerçekte olmayan yer / saat" uydurma riski
// yapısal olarak küçülür; kalanı guideValidator.js yakalar.
//
// Gizlilik: istemde kullanıcının adı, e-postası, başlangıç (otel) konumu ve kimliği YOKTUR; yalnızca
// ilgi düzeyleri, bütçe/tempo ve katalogdaki herkese açık mekânlar gönderilir.

export const PROMPT_VERSION = 'rehber-v1';

export const LIMITS = { genel: 300, baslik: 60, ozet: 280, ipucu: 160, neden: 160, oneri: 3 };

const MODE = { yuruyus: 'yürüyüş', 'toplu-tasima': 'toplu taşıma' };

export const SYSTEM_PROMPT = `Sen ${'{sehir}'} şehrini iyi bilen, kısa ve somut yazan bir yerel gezi rehberisin.
Görevin: sana verilen HAZIR gezi planını kişinin ilgi alanlarına göre anlatmak, durak başına pratik ipucu yazmak ve
yalnızca "oneri_adaylari" listesinden en uygun en fazla ${LIMITS.oneri} yeri önermek.

KURALLAR
1. Yalnızca VERİ'deki yerlerden söz et. Listede olmayan mekân, restoran, etkinlik veya semt adı UYDURMA.
2. Planı DEĞİŞTİRME: gün, sıra ve saatler aynen kalır; durak ekleme veya çıkarma.
3. Doğrulayamayacağın bilgileri YAZMA: giriş ücreti, fiyat, açılış-kapanış saati, adres, telefon, web adresi.
   Saat yazacaksan yalnızca planda verilen saatleri kullan.
4. Kişiye "sen" diye hitap et; ad veya kişisel bilgi kullanma.
5. Türkçe, sade ve somut yaz. Sınırlar: genel_bakis ≤ ${LIMITS.genel}, baslik ≤ ${LIMITS.baslik}, ozet ≤ ${LIMITS.ozet},
   ipucu ≤ ${LIMITS.ipucu}, neden ≤ ${LIMITS.neden} karakter.
6. "neden" alanında önerinin kişinin hangi ilgisine uyduğunu söyle.
7. Yanıtın YALNIZCA aşağıdaki biçimde TEK bir JSON nesnesi olsun; öncesinde/sonrasında açıklama veya markdown olmasın.

{
  "genel_bakis": "metin",
  "gunler": [ { "gun": 1, "baslik": "metin", "ozet": "metin", "ipuclari": [ { "poi_id": 1, "ipucu": "metin" } ] } ],
  "oneriler": [ { "poi_id": 1, "neden": "metin" } ]
}`;

// ctx: guideService.buildContext çıktısı
export function buildGuidePrompt(ctx) {
  const veri = {
    sehir: ctx.city,
    gun_sayisi: ctx.days.length,
    tempo: ctx.pace,
    butce: ctx.budget,
    ilgi_alanlari: ctx.interests.map((i) => ({ ad: i.name, duzey: `${i.weight}/5` })),
    gunler: ctx.days.map((d) => ({
      gun: d.day_number,
      duraklar: d.items.map((it) => ({
        poi_id: it.poi_id, ad: it.name, tur: it.interest_name, semt: it.district,
        baslangic: it.start_time, bitis: it.end_time, ulasim: MODE[it.travel_mode] ?? 'ilk durak',
      })),
    })),
    oneri_adaylari: ctx.candidates.map((c) => ({
      poi_id: c.id, ad: c.name, tur: c.interest_name, semt: c.district, aciklama: c.description,
    })),
  };
  return {
    version: PROMPT_VERSION,
    system: SYSTEM_PROMPT.replace('{sehir}', ctx.city),
    user: `VERİ:\n${JSON.stringify(veri, null, 1)}\n\nBu plan için kurallara uyan JSON gezi rehberini üret.`,
  };
}
