<script setup lang="ts">
/**
 * Afi — buharı tüten mutlu kase (public/icon.svg'nin bileşen hali).
 * Anatomi BRAND.md > Logo kurallarına bağlıdır: iki buhar teli (duotone),
 * kapalı mutlu gözler, emerald degrade zemin. Buhar CSS ile süzülür.
 */
const gid = useId()
</script>

<template>
  <svg viewBox="0 0 512 512" role="img" xmlns="http://www.w3.org/2000/svg">
    <title>afiet logosu — buharı tüten mutlu kase</title>
    <defs>
      <linearGradient :id="gid" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#10b981" />
        <stop offset="1" stop-color="#047857" />
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="116" :fill="`url(#${gid})`" />
    <g transform="translate(256 288) scale(1.07) translate(-256 -288)">
      <g fill="none" stroke-linecap="round">
        <path
          class="steam"
          d="M207 232c0-19 17-23 17-42s-17-21-17-40"
          stroke="#a7f3d0"
          stroke-width="21"
        />
        <path
          class="steam steam-b"
          d="M300 238c0-21 19-25 19-48s-19-23-19-46"
          stroke="#ffffff"
          stroke-width="23"
        />
      </g>
      <path d="M116 276h280a140 108 0 0 1-280 0z" fill="#ffffff" />
      <g fill="none" stroke="#047857" stroke-linecap="round">
        <path d="M180 316q23-21 46 0" stroke-width="15" />
        <path d="M286 316q23-21 46 0" stroke-width="15" />
        <path d="M238 342q18 14 36 0" stroke-width="13" />
      </g>
      <rect x="210" y="394" width="92" height="20" rx="10" fill="#ffffff" />
    </g>
  </svg>
</template>
