<script setup lang="ts">
import { destek } from '~/data/content'
import { aksanKenar, aksanMetin, aksanSerit, aksanZemin } from '~/utils/destekAksan'

/**
 * Destek merkezi girişi. Tasarım yönü "sıcak giriş, sağlam gövde": bu sayfa
 * sıcak ve keşfe açıktır (Afi, büyük arama, renk aksanlı kategori kartları),
 * kategori ve yazı sayfaları ise dokümantasyon işlevindedir.
 *
 * Aramanın boş sonucu buradan Afi'ye devreder: kutu bir şey bulamazsa soru
 * aşağıdaki panele taşınır (başka sayfalarda bağlantıyla buraya gelinir).
 */
const route = useRoute()

// Meta/canonical panelden yönetilir (varsayılanlar seoDefaults.ts'te).
usePageSeo()

const { data } = await useFetch('/api/destek', {
  key: 'destek-harita',
  default: () => ({ kategoriler: [], toplam: 0 }),
})

const kategoriler = computed(() => data.value?.kategoriler ?? [])
const doluKategoriler = computed(() => kategoriler.value.filter((k) => k.yazilar.length))

// Arama kutusundan ya da başka bir sayfadan gelen soru Afi paneline geçer.
const afiSorusu = ref(typeof route.query.soru === 'string' ? route.query.soru : '')

function afiyeSor(soru: string) {
  afiSorusu.value = soru
  const hedef = document.getElementById('afiye-sor')
  hedef?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Sık sorulanlar listesindeki yazılar gerçekten var mı? Yayınlanmamış bir
// yazıya çip vermek ziyaretçiyi 404'e götürür.
const sikSorulanlar = computed(() => {
  const yollar = new Set(
    kategoriler.value.flatMap((k) => k.yazilar.map((y) => `/destek/${k.slug}/${y.slug}`)),
  )
  return destek.popular.filter((p) => yollar.has(p.to))
})
</script>

<template>
  <div>
    <section class="mx-auto max-w-6xl px-5 pt-14 pb-8 sm:pt-20">
      <div class="mx-auto max-w-2xl text-center">
        <div class="afi-stage mx-auto w-fit" data-mood="idle" aria-hidden="true">
          <AfiPose class="h-20 w-20" />
        </div>
        <p class="mt-2 text-sm font-extrabold tracking-wide text-brand">{{ destek.eyebrow }}</p>
        <h1
          class="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl"
        >
          {{ destek.title }}
        </h1>
        <p class="mt-4 text-[17px] leading-relaxed text-soft">{{ destek.sub }}</p>
      </div>

      <div class="mx-auto mt-8 max-w-2xl">
        <DestekArama boyut="buyuk" yerinde @afiye-sor="afiyeSor" />
        <p class="mt-2.5 hidden text-center text-xs font-bold text-muted sm:block">
          {{ destek.searchHint }}
        </p>
      </div>

      <div v-if="sikSorulanlar.length" class="mx-auto mt-6 max-w-3xl">
        <p class="text-center text-xs font-extrabold tracking-widest text-muted uppercase">
          {{ destek.popularLabel }}
        </p>
        <ul class="mt-3 flex flex-wrap justify-center gap-2">
          <li v-for="p in sikSorulanlar" :key="p.to">
            <NuxtLink
              :to="p.to"
              class="inline-block rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-soft transition hover:border-brand/40 hover:text-brand-deep"
            >
              {{ p.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <section id="konular" class="mx-auto max-w-6xl scroll-mt-20 px-5 py-10">
      <h2 class="sr-only">{{ destek.categoriesTitle }}</h2>

      <div v-if="doluKategoriler.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="k in doluKategoriler"
          :key="k.slug"
          v-reveal
          :to="`/destek/${k.slug}`"
          class="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pl-7 shadow-lift transition duration-300 hover:-translate-y-1 hover:shadow-float"
          :class="aksanKenar[k.aksan]"
        >
          <span
            class="absolute inset-y-0 left-0 w-1.5"
            :class="aksanSerit[k.aksan]"
            aria-hidden="true"
          />
          <span
            class="grid h-12 w-12 place-items-center rounded-2xl"
            :class="[aksanZemin[k.aksan], aksanMetin[k.aksan]]"
            aria-hidden="true"
          >
            <DestekIkon :name="k.ikon" />
          </span>
          <h3
            class="mt-4 font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
          >
            {{ k.baslik }}
          </h3>
          <p class="mt-1.5 text-sm leading-relaxed text-soft">{{ k.aciklama }}</p>
          <p class="mt-4 text-xs font-extrabold tracking-wide text-muted">
            {{ k.yazilar.length }} {{ destek.countSuffix }}
          </p>
        </NuxtLink>
      </div>

      <p
        v-else
        class="rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center font-bold text-muted"
      >
        {{ destek.empty }}
      </p>
    </section>

    <!-- Aradığını bulamayanlar için Afi. Panel NUXT_PUBLIC_ASK_API_URL boşken
         hiç render edilmez; aşağıdaki insana ulaşma kutusu her hâlükârda kalır. -->
    <AskAfiSection :soru="afiSorusu" />

    <section class="mx-auto max-w-6xl px-5 pt-4 pb-24">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-3xl border border-line bg-surface p-6">
          <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
            {{ destek.contactTitle }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-soft">{{ destek.contactBody }}</p>
          <a
            :href="`mailto:${destek.contactMail}`"
            class="mt-4 inline-block font-extrabold text-brand transition hover:text-brand-deep"
          >
            {{ destek.contactMail }}
          </a>
        </div>
        <div class="rounded-3xl border border-line bg-surface p-6">
          <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
            {{ destek.statusLabel }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-soft">
            Uygulama ya da site beklediğin gibi çalışmıyorsa önce servislerin anlık durumuna
            bakabilirsin.
          </p>
          <NuxtLink
            :to="destek.statusTo"
            class="mt-4 inline-block font-extrabold text-brand transition hover:text-brand-deep"
          >
            {{ destek.statusLinkLabel }}
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
