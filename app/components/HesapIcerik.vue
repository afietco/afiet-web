<script setup lang="ts">
import type { HesapIcerik } from '#shared/types/hesap-icerik'

/**
 * Hesaplama sayfalarının uzun içeriği: katlanır bölümler + SSS.
 *
 * Kaynak `content/hesapla/<slug>.md`, okuma katmanı `server/utils/hesaplaStore.ts`.
 * Gövde SUNUCUDA markdown-it ile (html:false) üretilmiş güvenli HTML'dir; blog,
 * destek ve sürüm notlarındaki sözleşmenin aynısı, v-html güvenliği buna dayanır.
 *
 * NEDEN `<details>`: katlama JavaScript'e bağlı olsaydı içerik ilk HTML'de
 * bulunmaz, yani arama motoru yine boş sayfa görürdü. Native eleman hem SSR'da
 * tam metni basar hem klavyeyle açılır hem de Ctrl+F ile bulunur.
 *
 * SSS bölümü ayrı durur çünkü aynı soru/cevaplar FAQPage şemasına da giriyor
 * (seoStore.resolvePageMeta) ve ikisi tek kaynaktan gelmek zorunda.
 *
 * SSS başlığı gövdeden gelmez (store onu bölüm listesinden ayırır), bu yüzden
 * dilini yol söyler: /en altında İngilizce başlık basılır.
 */
defineProps<{ icerik: HesapIcerik }>()

const { locale } = useSiteLocale()
const faqBaslik = computed(() =>
  locale.value === 'en' ? 'Frequently asked questions' : 'Sık sorulanlar',
)
</script>

<template>
  <section class="mt-12">
    <div class="flex flex-col gap-3">
      <details
        v-for="(bolum, i) in icerik.sections"
        :id="bolum.id"
        :key="bolum.id"
        class="hesap-katlanir"
        :open="i === 0"
      >
        <summary>
          <span>{{ bolum.title }}</span>
          <svg
            class="hesap-ok"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </summary>
        <!-- eslint-disable-next-line vue/no-v-html -- sunucuda html:false ile üretildi -->
        <div class="hesap-govde" v-html="bolum.html" />
      </details>

      <details v-if="icerik.faq.length" id="sik-sorulanlar" class="hesap-katlanir">
        <summary>
          <span>{{ faqBaslik }}</span>
          <svg
            class="hesap-ok"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </summary>
        <dl class="hesap-sss">
          <div v-for="item in icerik.faq" :key="item.q">
            <dt>{{ item.q }}</dt>
            <dd>{{ item.a }}</dd>
          </div>
        </dl>
      </details>
    </div>
  </section>
</template>

<style scoped>
.hesap-katlanir {
  border: 1px solid var(--color-line);
  border-radius: 1.5rem;
  background: var(--color-surface);
  overflow: hidden;
}

.hesap-katlanir > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.5rem;
  color: var(--color-ink);
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  list-style: none;
  transition: color 0.18s ease;
}

/* Safari'nin varsayılan üçgeni; kendi okumuzu kullanıyoruz. */
.hesap-katlanir > summary::-webkit-details-marker {
  display: none;
}

.hesap-katlanir > summary:hover {
  color: var(--color-brand-deep);
}

.hesap-katlanir > summary:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: -2px;
}

.hesap-ok {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-muted);
  transition: transform 0.2s ease;
}

.hesap-katlanir[open] > summary .hesap-ok {
  transform: rotate(180deg);
}

.hesap-govde,
.hesap-sss {
  padding: 0 1.5rem 1.5rem;
  color: var(--color-soft);
  font-size: 16.5px;
  line-height: 1.72;
}

/* Gövde ritmi destek merkezindekiyle (.destek-govde) aynı tokenları kullanır;
   burada h2 yok çünkü başlık zaten summary'de duruyor. */
.hesap-govde :deep(p) {
  margin: 0.9em 0;
}

.hesap-govde :deep(p:first-child) {
  margin-top: 0;
}

.hesap-govde :deep(strong) {
  color: var(--color-ink);
  font-weight: 800;
}

.hesap-govde :deep(a) {
  color: var(--color-brand-deep);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-brand-mint);
}

.hesap-govde :deep(a:hover) {
  text-decoration-color: var(--color-brand);
}

.hesap-govde :deep(ul) {
  margin: 0.9em 0;
  padding-left: 1.3em;
  list-style: disc;
}

.hesap-govde :deep(ul li) {
  margin: 0.35em 0;
}

.hesap-govde :deep(ul li::marker) {
  color: var(--color-brand);
}

/* Numaralı liste = ADIM listesi; destek merkezindeki kuralın aynısı. */
.hesap-govde :deep(ol) {
  margin: 1.1em 0;
  padding-left: 0;
  list-style: none;
  counter-reset: hesap-adim;
  display: flex;
  flex-direction: column;
  gap: 0.55em;
}

.hesap-govde :deep(ol > li) {
  position: relative;
  counter-increment: hesap-adim;
  padding-left: 2.5em;
  min-height: 1.8em;
}

.hesap-govde :deep(ol > li::before) {
  content: counter(hesap-adim);
  position: absolute;
  top: 0.05em;
  left: 0;
  display: grid;
  place-items: center;
  width: 1.75em;
  height: 1.75em;
  border-radius: 999px;
  background: var(--color-brand-mint);
  color: var(--color-brand-deep);
  font-size: 0.8em;
  font-weight: 800;
}

/* Tablolar dar ekranda sayfayı yatay kaydırmaya zorlamasın diye kendi
   kabında kayar. */
.hesap-govde :deep(table) {
  display: block;
  overflow-x: auto;
  margin: 1.2em 0;
  border-collapse: collapse;
  width: 100%;
  font-size: 0.95em;
}

.hesap-govde :deep(th),
.hesap-govde :deep(td) {
  padding: 0.6em 0.9em;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
  vertical-align: top;
}

.hesap-govde :deep(th) {
  color: var(--color-ink);
  font-weight: 800;
  white-space: nowrap;
}

.hesap-govde :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

/* SSS: soru/cevap çiftleri düz metindir çünkü aynı metin FAQPage şemasına da
   giriyor. */
.hesap-sss > div + div {
  margin-top: 1.15em;
}

.hesap-sss dt {
  color: var(--color-ink);
  font-weight: 800;
}

.hesap-sss dd {
  margin: 0.3em 0 0;
}
</style>
