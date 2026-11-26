-- Migration 007: Yapay Zekâ Bileşeni — kişisel gezi rehberi ve AI kullanım günlüğü (Hafta 10)

-- Rotaya ait son üretilen rehber (yapay zekâ veya şablon). Rota planı değişince sıfırlanır.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS ai_guide JSONB;

-- Her yapay zekâ çağrısının kaydı: hangi model, hangi istem sürümü, sonuç doğrulandı mı, ne kadar sürdü.
-- Kişisel veri tutulmaz: istemin kendisi değil sürümü ve özeti (SHA-256) saklanır.
CREATE TABLE IF NOT EXISTS ai_logs (
  id             SERIAL PRIMARY KEY,
  user_id        INT REFERENCES users(id) ON DELETE SET NULL,
  trip_id        INT REFERENCES trips(id) ON DELETE SET NULL,
  feature        VARCHAR(40)  NOT NULL,                -- ör. 'gezi-rehberi'
  model          VARCHAR(80),                          -- NULL: yapay zekâ çağrılmadı (anahtar yok vb.)
  prompt_version VARCHAR(20)  NOT NULL,
  prompt_hash    CHAR(64),
  status         VARCHAR(20)  NOT NULL,
  latency_ms     INT,
  input_tokens   INT,
  output_tokens  INT,
  issues         JSONB        NOT NULL DEFAULT '[]'::jsonb,  -- doğrulamada bulunan sorunlar
  output_excerpt TEXT,                                       -- ham yanıtın ilk 4000 karakteri (inceleme için)
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_ai_logs_status CHECK (status IN ('gecerli', 'duzeltildi', 'gecersiz', 'hata', 'ayarsiz')),
  CONSTRAINT chk_ai_logs_numbers CHECK ((latency_ms IS NULL OR latency_ms >= 0)
    AND (input_tokens IS NULL OR input_tokens >= 0) AND (output_tokens IS NULL OR output_tokens >= 0))
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON ai_logs (user_id);
