# afiet-web, VDS icin.
#
# VERCEL'DE DEGISEN BIR SEY YOK: preset burada ortam degiskeniyle veriliyor,
# nuxt.config.ts'e dokunulmuyor. Koda gomulseydi dev ve staging'in Vercel
# deploylari bozulurdu - onlar Vercel'de kaliyor, yalniz production tasiniyor.
#
# TABAN node:24-slim (glibc): alpine/musl'da sharp'in yerel ikili secimi
# ayrisiyor, gereksiz bir degisken daha eklemeye gerek yok.
FROM node:24-slim AS build
WORKDIR /src

# Bagimliliklar ayri katmanda ki kod degisince cache bozulmasin.
#
# NEDEN `npm ci` DEGIL: package-lock.json macOS'ta uretilmis ve LINUX'a ozgu
# istege bagli bagimliliklari eksik - `@img/sharp-wasm32`'nin istedigi
# @emnapi/core ve @emnapi/runtime lock'ta yok. Sonuc: `npm ci` macOS'ta
# gecerken linux'ta "Missing from lock file" deyip patliyor (alpine'de de,
# glibc'de de). `npm install` agaci bu platform icin cozuyor; lock'un pinledigi
# surumler korunuyor, yalniz eksik platform dallari tamamlaniyor.
# KALICI COZUM: lock'u linux'ta uretip commit'lemek - ama o, Vercel
# deploylarini da etkiler, o yuzden ayri bir karar olarak birakildi.
# --ignore-scripts sart: postinstall "nuxt prepare" calistiriyor ve o,
# kaynak kod daha kopyalanmadan calisirsa patlar.
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts --no-audit --no-fund

COPY . .
RUN npm run postinstall

# Nitro'nun Vercel preset'i yerine duz Node sunucusu uret.
ENV NITRO_PRESET=node-server
RUN npm run build

# Calisma asamasi - yalnizca .output; kaynak kod ve node_modules tasinmiyor
# (Nitro gerekli her seyi .output/server/node_modules icine paketliyor).
FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /src/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
