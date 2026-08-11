<script setup lang="ts">
import { support } from '~/data/content'

/**
 * Destek yazısı. Üç kolon: solda kategori ağacı, ortada gövde, sağda
 * "Bu sayfada". 1280 pikselin altında sağ kolon katlanır kutuya iner,
 * 1024'ün altında sol ağaç da katlanır (SupportNav kendi içinde hâlleder).
 *
 * Gövde SUNUCUDA markdown-it ile (html:false) üretilmiş güvenli HTML'dir;
 * blogdaki sözleşmenin aynısı, v-html güvenliği buna dayanır.
 */
const route = useRoute()
const categorySlug = String(route.params.kategori ?? '')
const articleSlug = String(route.params.slug ?? '')

const { data, error } = await useFetch(`/api/destek/${categorySlug}/${articleSlug}`, {
  key: `destek-yazi:${categorySlug}/${articleSlug}`,
})
if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: 'Yazı bulunamadı',
    fatal: true,
  })
}

// Meta ve JSON-LD sunucuda çözülür (TechArticle + BreadcrumbList - seoStore).
usePageSeo()

const { data: map } = await useFetch('/api/destek', {
  key: 'destek-harita',
  default: () => ({ categories: [], total: 0 }),
})
const categories = computed(() => map.value?.categories ?? [])

const article = computed(() => data.value!.article)
const category = computed(() => data.value!.category)
const path = computed(() => `/destek/${categorySlug}/${articleSlug}`)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
</script>

<template>
  <div class="mx-auto max-w-7xl px-5 py-10 sm:py-14">
    <div
      class="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[15rem_minmax(0,1fr)_13rem] xl:gap-10"
    >
      <!-- Sol: kategori ağacı -->
      <aside class="mb-8 lg:mb-0">
        <div class="lg:sticky lg:top-24">
          <SupportNav
            :categories="categories"
            :active-category="categorySlug"
            :active-article="articleSlug"
          />
        </div>
      </aside>

      <!-- Orta: yazı -->
      <article class="min-w-0">
        <nav aria-label="Kırıntı yolu" class="text-sm font-bold text-muted">
          <NuxtLink to="/destek" class="transition hover:text-brand-deep">
            {{ support.breadcrumbRoot }}
          </NuxtLink>
          <span class="mx-1.5" aria-hidden="true">›</span>
          <NuxtLink :to="`/destek/${category.slug}`" class="transition hover:text-brand-deep">
            {{ category.title }}
          </NuxtLink>
        </nav>

        <h1
          class="mt-4 font-display text-3xl leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-4xl"
        >
          {{ article.title }}
        </h1>
        <p v-if="article.summary" class="mt-3 text-[17px] leading-relaxed text-soft">{{ article.summary }}</p>

        <!-- 1280 altında içindekiler: kaydırma takibi yok, katlanır liste yeter -->
        <details
          v-if="article.toc.length"
          class="destek-toc mt-6 rounded-2xl border border-line bg-surface xl:hidden"
        >
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-extrabold tracking-tight text-ink [&::-webkit-details-marker]:hidden"
          >
            <span>{{ support.tocTitle }}</span>
            <span class="destek-toc-ok text-brand transition duration-300" aria-hidden="true">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </summary>
          <ul class="flex flex-col gap-1 border-t border-line px-5 py-3">
            <li v-for="h in article.toc" :key="h.id" :class="h.level === 3 ? 'pl-4' : ''">
              <a
                :href="`#${h.id}`"
                class="text-sm font-semibold text-soft transition hover:text-brand-deep"
              >
                {{ h.text }}
              </a>
            </li>
          </ul>
        </details>

        <!-- Gövde: sunucuda üretilmiş güvenli HTML -->
        <div class="destek-govde mt-8" v-html="article.html" />

        <!-- Yazar künyesi: destek yazısının da TechArticle şemasında Person
             yazarı var (seoStore), sayfada görünen künye onun karşılığıdır.
             Gövdenin SONUNDA durur: dokümantasyonda okur önce cevabı arar,
             "kim yazdı" sorusu cevaptan sonra gelir. -->
        <div class="mt-10 border-t border-line pt-6">
          <YazarSatiri :prefix="support.authorPrefix" compact>
            <template #meta>
              {{ support.updatedPrefix }}:
              <time :datetime="article.updated">{{ formatDate(article.updated) }}</time>
            </template>
          </YazarSatiri>
        </div>

        <div class="mt-5">
          <SupportVote :path="path" />
        </div>

        <!-- Komşu yazılar: sıralı okuma yolu -->
        <nav
          v-if="article.previous || article.next"
          class="mt-8 grid gap-3 sm:grid-cols-2"
          aria-label="Bu başlıktaki diğer yazılar"
        >
          <NuxtLink
            v-if="article.previous"
            :to="`/destek/${category.slug}/${article.previous.slug}`"
            class="group rounded-2xl border border-line bg-surface px-5 py-4 transition hover:border-brand/40"
          >
            <span class="block text-xs font-extrabold tracking-widest text-muted uppercase">
              {{ support.prevLabel }}
            </span>
            <span
              class="mt-1 block font-extrabold tracking-tight text-ink transition group-hover:text-brand-deep"
            >
              {{ article.previous.title }}
            </span>
          </NuxtLink>
          <NuxtLink
            v-if="article.next"
            :to="`/destek/${category.slug}/${article.next.slug}`"
            class="group rounded-2xl border border-line bg-surface px-5 py-4 text-right transition hover:border-brand/40 sm:col-start-2"
          >
            <span class="block text-xs font-extrabold tracking-widest text-muted uppercase">
              {{ support.nextLabel }}
            </span>
            <span
              class="mt-1 block font-extrabold tracking-tight text-ink transition group-hover:text-brand-deep"
            >
              {{ article.next.title }}
            </span>
          </NuxtLink>
        </nav>

        <section v-if="article.related.length" class="mt-10">
          <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
            {{ support.relatedTitle }}
          </h2>
          <ul class="mt-3 flex flex-col gap-2">
            <li v-for="r in article.related" :key="`${r.category}/${r.slug}`">
              <NuxtLink
                :to="`/destek/${r.category}/${r.slug}`"
                class="font-bold text-soft transition hover:text-brand-deep"
              >
                {{ r.title }}
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Çıkmaz sokak yok: her yazının sonunda insana ve Afi'ye yol var -->
        <div class="mt-10 rounded-3xl border border-line bg-surface px-6 py-5">
          <p class="font-extrabold tracking-tight text-ink">{{ support.stuckTitle }}</p>
          <p class="mt-1.5 text-sm leading-relaxed text-soft">{{ support.stuckBody }}</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <NuxtLink to="/destek#afiye-sor" class="btn-primary !px-5 !py-2.5 text-sm">
              {{ support.stuckAskCta }}
            </NuxtLink>
            <a :href="`mailto:${support.contactMail}`" class="btn-ghost !px-5 !py-2.5 text-sm">
              {{ support.contactMail }}
            </a>
          </div>
        </div>
      </article>

      <!-- Sağ: yapışkan içindekiler, yalnız geniş ekranda -->
      <aside class="hidden xl:block">
        <div class="sticky top-24">
          <SupportToc :headings="article.toc" />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.destek-toc[open] .destek-toc-ok {
  transform: rotate(180deg);
}

/* Yazı gövdesi. Blogun (.post-body) destek sürümü: aynı tokenlar, daha sıkı
   ritim, gömme büyük harf YOK (yönerge okunur, edebiyat yapılmaz). */
.destek-govde {
  color: var(--color-soft);
  font-size: 16.5px;
  line-height: 1.72;
}
.destek-govde :deep(h2) {
  margin: 2em 0 0.55em;
  scroll-margin-top: 5.5rem;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.45em;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
}
.destek-govde :deep(h3) {
  margin: 1.7em 0 0.45em;
  scroll-margin-top: 5.5rem;
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.15em;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.destek-govde :deep(p) {
  margin: 0.9em 0;
}
.destek-govde :deep(a) {
  color: var(--color-brand-deep);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-brand-mint);
}
.destek-govde :deep(a:hover) {
  text-decoration-color: var(--color-brand);
}
.destek-govde :deep(strong) {
  color: var(--color-ink);
  font-weight: 800;
}
.destek-govde :deep(ul) {
  margin: 0.9em 0;
  padding-left: 1.3em;
  list-style: disc;
}
.destek-govde :deep(ul li) {
  margin: 0.35em 0;
}
.destek-govde :deep(ul li::marker) {
  color: var(--color-brand);
}

/* Numaralı liste = ADIM listesi. Destek yazısında sıralı liste her zaman bir
   yönergedir, o yüzden numara madde imi değil rozettir. */
.destek-govde :deep(ol) {
  margin: 1.1em 0;
  padding-left: 0;
  list-style: none;
  counter-reset: destek-adim;
  display: flex;
  flex-direction: column;
  gap: 0.55em;
}
.destek-govde :deep(ol > li) {
  position: relative;
  counter-increment: destek-adim;
  padding-left: 2.5em;
  min-height: 1.8em;
}
.destek-govde :deep(ol > li)::before {
  content: counter(destek-adim);
  position: absolute;
  top: 0.02em;
  left: 0;
  display: grid;
  place-items: center;
  width: 1.75em;
  height: 1.75em;
  border-radius: 999px;
  background: var(--color-brand-mint);
  color: var(--color-brand-ink);
  font-size: 0.82em;
  font-weight: 800;
  line-height: 1;
}
.destek-govde :deep(ol > li > p) {
  margin: 0;
}

/* İpucu ve dikkat kutuları (```ipucu / ```dikkat). Kırmızı uyarı kutusu
   BİLİNÇLİ olarak yok: marka kırmızıyı uyarı dili olarak kullanmıyor. */
.destek-govde :deep(.destek-kutu) {
  margin: 1.5em 0;
  padding: 0.95em 1.2em;
  border-left: 3px solid var(--color-brand);
  border-radius: 0 16px 16px 0;
  background: var(--color-surface);
}
.destek-govde :deep(.destek-kutu-dikkat) {
  border-left-color: var(--color-tahil);
}
.destek-govde :deep(.destek-kutu-etiket) {
  margin: 0 0 0.25em;
  color: var(--color-brand-deep);
  font-size: 0.72em;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}
.destek-govde :deep(.destek-kutu-dikkat .destek-kutu-etiket) {
  color: var(--color-tahil);
}
.destek-govde :deep(.destek-kutu p) {
  margin: 0.35em 0;
}
.destek-govde :deep(.destek-kutu p:last-child) {
  margin-bottom: 0;
}

/* Uygulama içi gezinme yolu (```yol) */
.destek-govde :deep(.destek-yol) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 1.2em 0;
  padding: 0.6em 0.9em;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: var(--color-surface);
  font-size: 0.93em;
}
.destek-govde :deep(.destek-yol-adim) {
  color: var(--color-ink);
  font-weight: 800;
}
.destek-govde :deep(.destek-yol-adim + .destek-yol-adim)::before {
  content: '›';
  margin: 0 0.5em;
  color: var(--color-muted);
  font-weight: 700;
}

.destek-govde :deep(blockquote) {
  margin: 1.4em 0;
  padding: 0.2em 1.2em;
  border-left: 3px solid var(--color-brand-mint);
  color: var(--color-ink);
  font-family: var(--font-display);
  font-size: 1.05em;
  font-style: italic;
  font-weight: 500;
}
.destek-govde :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 6px;
  background: var(--color-surface);
  font-size: 0.9em;
}
.destek-govde :deep(.destek-kod) {
  margin: 1.2em 0;
  padding: 0.9em 1.1em;
  overflow-x: auto;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: var(--color-surface);
  font-size: 0.88em;
}
.destek-govde :deep(hr) {
  margin: 2em 0;
  border: 0;
  border-top: 1px solid var(--color-line);
}
.destek-govde :deep(img) {
  max-width: 100%;
  border-radius: 16px;
}
.destek-govde :deep(table) {
  width: 100%;
  margin: 1.2em 0;
  border-collapse: collapse;
  font-size: 0.92em;
}
.destek-govde :deep(th),
.destek-govde :deep(td) {
  padding: 0.5em 0.7em;
  border: 1px solid var(--color-line);
  text-align: left;
}
.destek-govde :deep(th) {
  background: var(--color-surface);
  color: var(--color-ink);
}
</style>
