// YEDEK: Yapay zekâ OLMADAN, kurallarla üretilen rehber.
// Yapay zekâ servisi ayarlı değilse, hata verirse veya çıktısı doğrulamadan geçemezse kullanılır.
// Aynı veriden her zaman aynı sonucu üretir; uydurma yapamaz ama dili kalıplıdır (farkı raporda anlatıldı).

const join = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} ve ${arr[arr.length - 1]}`);

function mostCommon(values) {
  const count = new Map();
  for (const v of values.filter(Boolean)) count.set(v, (count.get(v) || 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

export function buildFallbackGuide(ctx) {
  const top = ctx.interests.slice(0, 2).map((i) => i.name.toLocaleLowerCase('tr'));
  const genel = `${ctx.days.length} günlük, ${ctx.pace} tempolu ${ctx.city} planın`
    + (top.length ? ` en çok ilgi duyduğun ${join(top)} çevresinde kuruldu.` : ' ilgi profiline göre kuruldu.')
    + ' Her gün birbirine yakın yerleri bir araya getirir.';

  const gunler = ctx.days.map((d) => {
    const items = d.items;
    if (!items.length) return { gun: d.day_number, baslik: `${d.day_number}. gün`, ozet: 'Bu gün için durak yok.', ipuclari: [] };
    const districts = mostCommon(items.map((i) => i.district)).slice(0, 2);
    const kinds = mostCommon(items.map((i) => i.interest_name)).slice(0, 2).map((k) => k.toLocaleLowerCase('tr'));
    const longest = [...items].sort((a, b) => (b.visit_minutes ?? 0) - (a.visit_minutes ?? 0))[0];
    const walk = items.filter((i) => i.travel_mode === 'yuruyus').length;
    return {
      gun: d.day_number,
      baslik: districts.length ? `${join(districts)} günü` : `${d.day_number}. gün`,
      ozet: `${items.length} durak, ${items[0].start_time}–${items[items.length - 1].end_time} arası; ağırlıkla ${join(kinds)}.`
        + (walk ? ` ${walk} geçiş yürüyerek yapılıyor, rahat ayakkabı iyi olur.` : ''),
      ipuclari: longest?.visit_minutes ? [{
        poi_id: longest.poi_id, ad: longest.name,
        ipucu: `Günün en uzun ziyareti (yaklaşık ${longest.visit_minutes} dk); acele etmemek için zamanını buna göre ayır.`,
      }] : [],
    };
  });

  const oneriler = ctx.candidates.slice(0, 3).map((c) => ({
    poi_id: c.id, ad: c.name, semt: c.district ?? null, tur: c.interest_name ?? null,
    neden: (c.reasons || []).filter((r) => !/km uzakta/.test(r)).join(', ') || 'İlgi alanlarına uygun.',
  }));

  return { genel_bakis: genel, gunler, oneriler };
}
