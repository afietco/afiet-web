import { defineConfig } from 'vitest/config'

/**
 * Yalnız `shared/` altındaki saf hesap testleri. Nuxt bileşenleri burada
 * koşmaz; sitenin uçtan uca doğrulaması `npm run smoke` ile yapılır.
 */
export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts'],
    environment: 'node',
  },
})
