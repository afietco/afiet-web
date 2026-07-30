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
  printf '%s' "$2" | vercel env add "$1" "$3" ${4:-} --sensitive --force
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
}

echo "→ development dalı (preview): dev Stack projesi + dev Neon"
setup_env dev preview development

echo "→ staging dalı (preview): staging Stack projesi + staging Neon"
setup_env staging preview staging

echo "→ production: prod Stack projesi + prod Neon"
setup_env prod production

echo "✓ Bitti. Kontrol: vercel env ls"
