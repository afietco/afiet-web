import { defineConfig } from 'vitest/config'

/**
 * Saf fonksiyon testleri. Nuxt bileşenleri burada koşmaz; sitenin uçtan uca
 * doğrulaması `npm run smoke` ile yapılır.
 *
 * `server/` yolu `shared/`in yanına SONRADAN eklendi ve kapsamı dardır:
 * yalnız Nuxt otomatik içe aktarmalarına (useRuntimeConfig, createError)
 * dokunmayan saf yardımcılar. Bir sunucu dosyası bunlardan birini
 * kullanıyorsa buradan koşamaz, çünkü import anında çözülemez.
 */
export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node',
  },
})
