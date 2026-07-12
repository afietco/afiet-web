/**
 * v-reveal: eleman görünüme girince .is-in ekler (stiller main.css'te).
 * Değer verilirse gecikme olur: v-reveal="120" → 120ms kademeli giriş.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) {
    nuxtApp.vueApp.directive('reveal', { getSSRProps: () => ({}) })
    return
  }

  let io: IntersectionObserver | undefined
  const observer = () =>
    (io ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io!.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    ))

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>('reveal', {
    mounted(el, binding) {
      el.classList.add('reveal')
      if (binding.value != null) el.style.setProperty('--d', `${binding.value}ms`)
      observer().observe(el)
    },
    unmounted(el) {
      io?.unobserve(el)
    },
  })
})
