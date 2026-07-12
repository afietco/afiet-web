# afiet-web

[afiet.co](https://afiet.co) — afiet mobil uygulamasının tanıtım sitesi (landing).
Uygulamanın kendisi yalnızca native mobil olarak yaşar; bu site markanın web vitrinini üstlenir.

## Stack

- **Nuxt 4** (Vue 3) — tam statik üretim (`/` build sırasında prerender edilir)
- **Tailwind CSS v4** (`@tailwindcss/vite`) — marka tokenları `app/assets/css/main.css`
- **Nunito Variable** (`@fontsource-variable/nunito`, self-host)
- İçerik metinleri tek yerde: `app/data/content.ts`

Marka kuralları (isim yazımı, ses tonu, logo, renk): `afiet-mobile/BRAND.md`.

## Komutlar

```bash
npm run dev        # geliştirme sunucusu
npm run build      # üretim build'i (prerender dahil)
npm run preview    # build önizleme
npm run typecheck  # vue-tsc tip kontrolü
npm run smoke      # build edilmiş siteyi gerçek Chrome'da doğrular
npm run assets     # public/og.png sosyal görselini yeniden üretir
```

Smoke testi bu Mac'te sistem Chrome'unu, CI'da `CHROME_PATH` env'ini kullanır.

## Ortam değişkenleri

| Değişken | Amaç |
| --- | --- |
| `NUXT_PUBLIC_WAITLIST_ENDPOINT` | Bekleme listesi kayıt endpoint'i (`POST {email, source}`). Boşken form yerine "çok yakında" satırı gösterilir. |

## Dallar ve deploy

Dal modeli monorepo ile aynıdır: `feature/*` → `development` → `staging` → `main`
(ayrıntı: `afiet-mobile/docs/BRANCHING.md`). CI üç ana dala giden PR/push'larda çalışır.

Deploy: Vercel, zero-config Nuxt (`main` = production, diğer dallar preview).
Vercel projesi bağlanırken Root Directory repo köküdür; ek ayar gerekmez.
