<script setup lang="ts">
/**
 * Afi maskotu - tile'sız serbest duruş (afiet-brand/maskot/afi-temel.svg).
 *
 * Logo DEĞİLDİR: logo (AfiMascot.vue) emerald tile üstünde yaşar, maskot
 * tile'sız durur ve ekranın içine iner (afiet-brand/maskot/README.md).
 * İkisi ayrı varlıklardır, biri diğerinin yerine kullanılmaz.
 *
 * Değişmezler (BRAND.md + maskot README):
 *   - Yüz hiç değişmez: kapalı mutlu gözler + minik gülümseme, hep #047857.
 *   - Buhar HEP iki tel. Açık zeminde kısa tel mint, uzun tel marka yeşili.
 *   - Üzgün / kızgın Afi yapılmaz. Duyguyu duruş, buhar ve sahne taşır.
 *   - Kase + ayak açık zeminde #ece4d4 ile 4px konturlanır (beyaz kartta
 *     figürü tanımlar, kremde görünmez kalır).
 *
 * Pozlar arası geçiş SVG dosyası değiştirilerek değil, CSS ile yapılır:
 * afi-temel / afi-selam / afi-merak aynı geometrinin transform varyantları
 * olduğu için tek bileşen üçünü de karşılar ve geçişler yumuşak olur.
 * Hareket sınıfları main.css'te, .afi-stage[data-mood] altında.
 *
 * DİKKAT: CSS transform'u, aynı elemandaki transform ÖZNİTELİĞİNİ ezer.
 * Bu yüzden ölçek transform'unu taşıyan grup (.afi-scale) ile CSS'in
 * döndürdüğü gruplar (.afi-body, .afi-bowl, .afi-steam) ayrı tutulur.
 */
</script>

<template>
  <svg viewBox="0 0 512 512" role="img" xmlns="http://www.w3.org/2000/svg">
    <title>Afi, afiet’in sofra arkadaşı</title>

    <!-- Zemin gölgesi: figür havalandıkça küçülür (idle/float) -->
    <ellipse class="afi-shadow" cx="256" cy="437" rx="116" ry="14" fill="#022c22" opacity=".08" />

    <g class="afi-body">
      <g class="afi-scale" transform="translate(256 288) scale(1.07) translate(-256 -288)">
        <!-- İki buhar teli. Üç tel asla. -->
        <g fill="none" stroke-linecap="round">
          <path
            class="afi-steam afi-steam-a"
            d="M207 232c0-19 17-23 17-42s-17-21-17-40"
            stroke="#a7f3d0"
            stroke-width="21"
          />
          <path
            class="afi-steam afi-steam-b"
            d="M300 238c0-21 19-25 19-48s-19-23-19-46"
            stroke="#059669"
            stroke-width="23"
          />
        </g>

        <g class="afi-bowl">
          <path d="M116 276h280a140 108 0 0 1-280 0z" fill="#ffffff" stroke="#ece4d4" stroke-width="4" />
          <g fill="none" stroke="#047857" stroke-linecap="round">
            <path d="M180 316q23-21 46 0" stroke-width="15" />
            <path d="M286 316q23-21 46 0" stroke-width="15" />
            <path d="M238 342q18 14 36 0" stroke-width="13" />
          </g>
          <rect x="210" y="394" width="92" height="20" rx="10" fill="#ffffff" stroke="#ece4d4" stroke-width="4" />
        </g>
      </g>
    </g>

    <!-- Merak pozunun kıvılcımı: yalnız "dinliyor" modunda belirir -->
    <path
      class="afi-spark"
      d="M404 128l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"
      fill="#a7f3d0"
      opacity="0"
    />
  </svg>
</template>
