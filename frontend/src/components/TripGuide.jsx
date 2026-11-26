// Yapay zekâ ile kişisel gezi rehberi (Hafta 10)
// Kaynak her zaman açıkça gösterilir: "Yapay zekâ (model) · doğrulandı" veya "Şablon (yapay zekâ kullanılamadı: neden)".
// onGenerate verilmezse (paylaşım sayfası) salt okunur gösterir.
import { useState } from 'react';

const STATUS = {
  gecerli: 'doğrulandı',
  duzeltildi: 'doğrulandı, bazı kısımlar düzeltildi',
};

export default function TripGuide({ guide, activeDay, onGenerate }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true); setError('');
    try { await onGenerate(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!guide) {
    if (!onGenerate) return null;
    return (
      <section className="guide card-lite">
        <h2>✨ Kişisel gezi rehberi</h2>
        <p className="muted">İlgi alanlarına göre her günü anlatan kısa bir rehber ve katalogdan yerel öneriler.</p>
        <button className="primary" onClick={run} disabled={busy}>{busy ? 'Hazırlanıyor… (birkaç saniye)' : 'Rehber oluştur'}</button>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    );
  }

  const day = guide.gunler?.find((g) => g.gun === activeDay);
  const ai = guide.kaynak === 'yapay-zeka';
  return (
    <section className="guide card-lite">
      <h2>✨ Kişisel gezi rehberi</h2>
      <p className={`guide-source ${ai ? 'ai' : 'tpl'}`}
         title={`İstem sürümü: ${guide.istem_surumu} · ${new Date(guide.uretildi).toLocaleString('tr-TR')}`}>
        {ai ? `Yapay zekâ ile üretildi (${guide.model}) · ${STATUS[guide.durum] ?? guide.durum}` : 'Kurallarla hazırlandı (şablon)'}
      </p>
      {guide.uyarilar?.map((u) => <p key={u} className="muted small">{u}</p>)}
      <p>{guide.genel_bakis}</p>

      {day && (
        <div className="guide-day">
          <h3>{day.gun}. gün · {day.baslik}</h3>
          {day.ozet && <p>{day.ozet}</p>}
          {day.ipuclari?.length > 0 && (
            <ul>{day.ipuclari.map((t) => <li key={t.poi_id}><strong>{t.ad}:</strong> {t.ipucu}</li>)}</ul>
          )}
        </div>
      )}

      {guide.oneriler?.length > 0 && (
        <div className="guide-recs">
          <h3>Bunları da sevebilirsin</h3>
          <ul>
            {guide.oneriler.map((o) => (
              <li key={o.poi_id}><strong>{o.ad}</strong>{o.semt ? <small className="muted"> · {o.semt}</small> : null}<br /><small>{o.neden}</small></li>
            ))}
          </ul>
        </div>
      )}

      {ai && <p className="muted small">Yapay zekâ hata yapabilir; ziyaret saatlerini ve ücretleri gitmeden kontrol et.</p>}
      {onGenerate && <button className="ghost" onClick={run} disabled={busy}>{busy ? 'Hazırlanıyor…' : 'Yeniden oluştur'}</button>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
