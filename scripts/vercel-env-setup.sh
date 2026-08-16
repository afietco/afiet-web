#!/usr/bin/env bash
# SEO & GEO paneli için Vercel env kurulumu (afiet-web projesi).
# Değerleri Secret Manager'dan (gcloud) ve yerel .env'den OKUR - script'e
# secret gömülmez. Repo kökünden çalıştır: bash scripts/vercel-env-setup.sh
#
# Gerekenler: `vercel` (login'li, proje linkli) + `gcloud` (afiet-co erişimi).
set -euo pipefail
cd "$(dirname "$0")/.."

CORS="https://admin.afiet.co,https://afiet-admin.vercel.app"
EMAILS="admin@afiet.co"

secret() { gcloud secrets versions access latest --secret="$1" --project afiet-co; }
add() { # add <isim> <değer> <ortam> [dal]
  # --sensitive: projedeki mevcut kayıtların tipi bu; --force ile üstüne yazarken
  # tip değişirse `vercel env pull` bazı değerleri boş string olarak indirir.
  #
  # Değer stdin'den DEĞİL --value ile geçer: CLI 54 boruyu artık okumuyor ve
  # "missing_value" diye action_required döndürüp sessizce hiçbir şey yazmıyor
  # (16 Ağu 2026'da yaşandı). --yes etkileşimli onayı atlar.
  vercel env add "$1" "$3" ${4:-} --value "$2" --yes --sensitive --force
}

setup_env() { # setup_env <secret-prefix> <vercel-ortam> [dal]
  local p="$1" env="$2" branch="${3:-}"
  local id issuer jwks db
  issuer=$(secret "app-$p-auth-issuer")
  id=$(secret "app-$p-auth-audience")
  jwks=$(secret "app-$p-auth-jwks-url")
  add NUXT_ADMIN_JWKS_URL "$jwks" "$env" $branch
  add NUXT_ADMIN_ISSUER "$issuer" "$env" $branch
  add NUXT_ADMIN_AUDIENCE "$id" "$env" $branch
  add NUXT_ADMIN_EMAILS "$EMAILS" "$env" $branch
  add NUXT_ADMIN_CORS_ORIGINS "$CORS" "$env" $branch
  # DB: her ortam KENDİ Neon branch'ine bağlanır - kaynak backend'in kullandığı
  # secret'ın ta kendisi (app-<ortam>-database-url). Yerel .env'den OKUMA:
  # geliştirme makinesindeki string prod'u gösterirse preview'lar prod'a yazar.
  db=$(secret "app-$p-database-url")
  add NUXT_DATABASE_URL "$db" "$env" $branch
  # İçerik takvimi ekleri: TEK servis hesabı anahtarı üç ortamda da aynıdır
  # (kova bir, ortamlar nesne prefix'i ile ayrılır: prod/ staging/ dev/).
  # base64: Vercel env'inde çok satırlı JSON taşımak kırılgan.
  local gcs
  gcs=$(secret app-content-gcs-key | base64 | tr -d '\n')
  add NUXT_GCS_SA_KEY "$gcs" "$env" $branch
  add NUXT_GCS_BUCKET "afiet-icerik" "$env" $branch
  # Sosyal hesap token'larinin sifreleme anahtari (uc ortamda AYNI) + ortam
  # basina cron sirri. Instagram app kimlikleri BURADA YOK: Meta uygulamasi
  # elle acilir ve NUXT_IG_APP_ID/SECRET tek seferlik elle girilir.
  add NUXT_SOCIAL_TOKEN_KEY "$(secret app-social-token-key)" "$env" $branch
  add NUXT_CRON_SECRET "$(secret app-$p-cron-secret)" "$env" $branch
}

echo "→ development dalı (preview): dev Stack projesi + dev Neon"
setup_env dev preview development

echo "→ staging dalı (preview): staging Stack projesi + staging Neon"
setup_env staging preview staging

echo "→ production: prod Stack projesi + prod Neon"
setup_env prod production

# GSC senkronu YALNIZ production'da: veri sc-domain:afiet.co mülküne ait,
# dev/staging panelde "bağlantı kurulmadı" gösterir (bilinçli). Secret zaten
# base64 saklanır (app-gsc-sa-key), yeniden encode etme.
echo "→ production: GSC servis hesabı anahtarı"
add NUXT_GSC_SA_KEY "$(secret app-gsc-sa-key)" production

# Durum uyarılarının teşhis katmanı, YALNIZ production: kesinti maili yalnız
# oradan çıkar. Anahtar Cloud Run loglarını okur (status-watch@afiet-co,
# tek yetkisi roles/logging.viewer) ve base64 saklanır.
# Boşsa mailde "sunucu logları" bölümü hiç görünmez, uyarı yine gider.
echo "→ production: durum teşhisi için log okuma anahtarı"
add NUXT_STATUS_LOG_KEY "$(secret app-status-log-key)" production

# Kesinti anındaki canlı web araması (isteğe bağlı). Sağlayıcı anahtarın
# önekinden tanınır: `tvly-` Tavily, değilse Brave. Secret yoksa bu adım
# atlanır ve arama bölümü hiç görünmez.
if gcloud secrets describe app-status-search-key --project afiet-co >/dev/null 2>&1; then
  echo "→ production: canlı arama anahtarı"
  add NUXT_SEARCH_API_KEY "$(secret app-status-search-key)" production
else
  echo "→ arama anahtarı yok (app-status-search-key); arama bölümü kapalı kalacak"
fi

echo "✓ Bitti. Kontrol: vercel env ls"
