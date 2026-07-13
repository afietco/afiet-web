# afiet-web

afiet.co tanıtım sitesi (landing). Uygulama yalnızca native mobilde yaşar —
bu sitede uygulamaya/PWA'ya link verilmez; CTA'lar store rozetleri ("yakında")
ve bekleme listesidir. UI dili tamamen Türkçe.

Marka rehberi: `../afiet-mobile/BRAND.md` — isim HER YERDE küçük harf "afiet"
(cümle başında bile; `uppercase` sınıfı isme asla değmez), tagline
"Sayma, dengele.", ses tonu "sofrada seni seven biri" (sen dili, yargı yok).

## Stack ve yapı

- Nuxt 4 + Tailwind v4 (`@tailwindcss/vite`), tam statik prerender (`nitro.prerender`)
- Tasarım tokenları ve animasyonlar: `app/assets/css/main.css` (@theme) —
  sayfa bilinçli olarak tek temadır (açık/krem "sıcak sofra"); dark mode yok
- Tüm metin içeriği: `app/data/content.ts` — kopya değişikliği bileşene dokunmaz
- Bileşenler `app/components/` altında bölüm başına tektir (SiteHeader, HeroSection,
  PhoneMock, ZagSection, VoiceSection, CtaSection, WaitlistForm, SiteFooter…)
- `v-reveal` direktifi (`app/plugins/reveal.ts`) scroll'da `.is-in` ekler;
  hero'daki açılış animasyonu `.rise` sınıfıyla CSS'te
- Afi maskotu `AfiMascot.vue` — buhar telleri hep İKİ tanedir, yüz ifadesi sabittir
  (BRAND.md > Logo); `public/icon.svg` ile birlikte değişir
- Bekleme listesi: `server/api/waitlist.post.ts` (Nitro) → Neon `waitlist` tablosu
  (`@neondatabase/serverless`, tablo kendi kendini kurar — CREATE TABLE IF NOT EXISTS +
  ON CONFLICT). E-posta doğrulama + honeypot (`company` alanı) + kaynak etiketi.
  Connection string `NUXT_DATABASE_URL` (runtimeConfig.databaseUrl, server-side).
  `WaitlistForm.vue` durum makinesi: idle→sending→done/exists/soon/error, başarıda
  konfetili kutlama. Backend'in AYNI Neon'una yazar ama golang-migrate şemasından
  ayrı tablo (landing'e ait).

## Komutlar

- `npm run dev` / `build` / `preview`
- `npm run typecheck` — vue-tsc
- `npm run smoke` — build sonrası gerçek Chrome doğrulaması (`scripts/smoke.mjs`);
  bu Mac'te sistem Chrome'u, CI'da `CHROME_PATH`
- `npm run assets` — `public/og.png`'yi yeniden üretir (`scripts/generate-assets.mjs`)

## Bilinen tuhaflıklar

- devDependencies'teki `commander` bizim kodumuz için değil: svgo@4'ün
  (nuxt → cssnano zinciri) opsiyonel peer'ı; npm bunu lock'a yazmayı atlıyor
  ve CI'da `npm ci` senkron hatası veriyor. Kaldırmadan önce `npm ci --dry-run`
  ile doğrula.
- CI bilinçli olarak `npm ci` DEĞİL `npm install` kullanır: npm, platforma göre
  atlanan opsiyonelleri (tailwind oxide wasm zinciri, @emnapi/*) lock'a eksik
  yazabiliyor (npm/cli#4828) ve `npm ci` linux'ta düşüyor. `npm ci`ya geri
  dönmeden önce CI'ın üç dalda da yeşil olduğunu görmeden merge etme.

## Kurallar

- Bekleme listesi Neon'a `NUXT_DATABASE_URL` ile yazar (yukarı bkz.); boşken route
  503 'soon' döner, form "çok yakında" moduna geçer. Çalışmayan form yayınlanmaz.
- Dal modeli: `feature/*` → `development` → `staging` → `main`
  (`afiet-mobile/docs/BRANCHING.md`). `main` = Vercel production.
- Her anlamlı değişiklikten sonra: `npm run build && npm run smoke`.
- Emoji yalnızca mesaj metinlerinde/avatarlarda; ikon gereken yerde inline SVG.
