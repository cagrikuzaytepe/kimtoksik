-- Rate limiting tablosu
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP adresi ve pencere basina indeks
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_window 
ON rate_limits(ip_address, window_start);

-- RLS politikalari
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role icin tam erisim
CREATE POLICY "Service role can manage rate_limits" ON rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

-- Temizlik fonksiyonu (eski kayitlari siler)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;
