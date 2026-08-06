import { counterpartOf, localeOf, type SiteLocale } from '#shared/utils/locales'

/**
 * Sayfanın dili ve öteki dildeki karşılığı. Dil URL'den türer (/en altı
 * İngilizce), ayrı bir durum tutulmaz; kaynak shared/utils/locales.ts'tir.
 * `counterpart` null ise sayfanın çevirisi yoktur ve dil düğmesi görünmez.
 */
export function useSiteLocale() {
  const route = useRoute()
  const locale = computed<SiteLocale>(() => localeOf(route.path))
  const counterpart = computed<string | null>(() => counterpartOf(route.path))
  return { locale, counterpart }
}
