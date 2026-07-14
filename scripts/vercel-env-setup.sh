#!/usr/bin/env bash
# SEO & GEO paneli için Vercel env kurulumu (afiet-web projesi).
# Değerleri Secret Manager'dan (gcloud) ve yerel .env'den OKUR — script'e
# secret gömülmez. Repo kökünden çalıştır: bash scripts/vercel-env-setup.sh
#
# Gerekenler: `vercel` (login'li, proje linkli) + `gcloud` (afiet-co erişimi).
set -euo pipefail
cd "$(dirname "$0")/.."

CORS="https://admin.afiet.co,https://afiet-admin.vercel.app"
EMAILS="admin@afiet.co"

secret() { gcloud secrets versions access latest --secret="$1" --project afiet-co; }
add() { # add <isim> <değer> <ortam> [dal]
  printf '%s' "$2" | vercel env add "$1" "$3" ${4:-} --force
}

setup_env() { # setup_env <secret-prefix> <vercel-ortam> [dal]
  local p="$1" env="$2" branch="${3:-}"
  local id issuer jwks
  issuer=$(secret "app-$p-auth-issuer")
  id=$(secret "app-$p-auth-audience")
  jwks=$(secret "app-$p-auth-jwks-url")
  add NUXT_ADMIN_JWKS_URL "$jwks" "$env" $branch
  add NUXT_ADMIN_ISSUER "$issuer" "$env" $branch
  add NUXT_ADMIN_AUDIENCE "$id" "$env" $branch
  add NUXT_ADMIN_EMAILS "$EMAILS" "$env" $branch
  add NUXT_ADMIN_CORS_ORIGINS "$CORS" "$env" $branch
}

echo "→ development dalı (preview): dev Stack projesi"
setup_env dev preview development
if [ -f .env ] && grep -q '^NUXT_DATABASE_URL=.' .env; then
  add NUXT_DATABASE_URL "$(grep '^NUXT_DATABASE_URL=' .env | cut -d= -f2-)" preview development
fi

echo "→ staging dalı (preview): staging Stack projesi"
setup_env staging preview staging
# staging DB istenirse: staging Neon URL'ini elle ekleyin (vercel env add NUXT_DATABASE_URL preview staging)

echo "→ production: prod Stack projesi"
setup_env prod production

echo "✓ Bitti. Kontrol: vercel env ls"
