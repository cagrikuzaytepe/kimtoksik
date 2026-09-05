-- Reports tablosu icin RLS politikalari

-- Mevcut tabloyu kontrol et ve RLS'i aktif et
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Service role icin tam erisim
CREATE POLICY "Service role can manage reports" ON reports
  FOR ALL
  USING (auth.role() = 'service_role');

-- Anonim kullanicilar sadece okuyabilir (public access)
CREATE POLICY "Public can read reports" ON reports
  FOR SELECT
  USING (true);

-- Anonim kullanicilar sadece insert yapabilir (public access)
CREATE POLICY "Public can insert reports" ON reports
  FOR INSERT
  WITH CHECK (true);

-- Guncelleme ve silme yok
-- (UPDATE ve INSERT politikalari yok, dolayisiyla yapilmaz)
