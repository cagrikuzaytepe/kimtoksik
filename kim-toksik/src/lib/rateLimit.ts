import { getSupabaseAnon } from "./supabase";

interface RateLimitEntry {
  request_count: number;
  window_start: string;
}

export async function checkRateLimit(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const supabase = getSupabaseAnon();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // Mevcut penceredeki istek sayisini kontrol et
  const { data, error } = await supabase
    .from("rate_limits")
    .select("request_count, window_start")
    .eq("ip_address", ip)
    .gte("window_start", windowStart.toISOString())
    .order("window_start", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // Hata olursa izin ver (fallback)
    console.error("Rate limit check error:", error);
    return { allowed: true, retryAfterMs: 0 };
  }

  if (!data) {
    // Ilk istek - yeni kayit olustur
    const { error: insertError } = await supabase
      .from("rate_limits")
      .insert({
        ip_address: ip,
        request_count: 1,
        window_start: now.toISOString(),
      });

    if (insertError) {
      console.error("Rate limit insert error:", insertError);
    }
    return { allowed: true, retryAfterMs: 0 };
  }

  const entry = data as RateLimitEntry;
  const entryTime = new Date(entry.window_start).getTime();
  const timePassed = now.getTime() - entryTime;

  // Pencere suresi dolmussa yeni pencere baslat
  if (timePassed > windowMs) {
    const { error: updateError } = await supabase
      .from("rate_limits")
      .update({
        request_count: 1,
        window_start: now.toISOString(),
      })
      .eq("ip_address", ip)
      .eq("window_start", entry.window_start);

    if (updateError) {
      console.error("Rate limit update error:", updateError);
    }
    return { allowed: true, retryAfterMs: 0 };
  }

  // Limit asildi mi?
  if (entry.request_count >= maxRequests) {
    const retryAfterMs = windowMs - timePassed;
    return { allowed: false, retryAfterMs };
  }

  // Istek sayisini artir
  const { error: incrementError } = await supabase
    .from("rate_limits")
    .update({
      request_count: entry.request_count + 1,
    })
    .eq("ip_address", ip)
    .eq("window_start", entry.window_start);

  if (incrementError) {
    console.error("Rate limit increment error:", incrementError);
  }

  return { allowed: true, retryAfterMs: 0 };
}

// Temizlik fonksiyonu (istege bagli)
export async function cleanupOldRateLimits(): Promise<void> {
  const supabase = getSupabaseAnon();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const { error } = await supabase
    .from("rate_limits")
    .delete()
    .lt("window_start", tenMinutesAgo.toISOString());

  if (error) {
    console.error("Rate limit cleanup error:", error);
  }
}
