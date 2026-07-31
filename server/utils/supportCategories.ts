import type { SupportCategory } from '#shared/types/support'

/**
 * Destek merkezinin kategori seti. Yazılar `content/destek/<kategori>/<slug>.md`
 * dosyalarında yaşar; kategori listesi burada, kodda durur çünkü nadiren değişir
 * ve sıra, renk, açıklama gibi alanları tasarım kararıdır.
 *
 * Vurgu renkleri uygulamadaki besin grubu renklerinin aynısıdır
 * (main.css > @theme). İlk beş kategori ürün konularıdır ve renk taşır; son
 * ikisi bilinçli olarak nötrdür, çünkü türü farklıdır (yasal ve teknik).
 *
 * Kategori slug'ı bir kez yayınlandıktan sonra DEĞİŞTİRİLMEZ: adres
 * `/destek/<kategori>/<slug>` ve panelin yönlendirme tablosu buna dayanır.
 */
export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    slug: 'baslangic',
    title: 'Başlangıç',
    summary: 'Kurulumdan ilk güne',
    description:
      'afiet’i ilk kez açıyorsan buradan başla: kurulum, hesap, profil ve ' +
      'sofranın ölçü diliyle tanışma.',
    accent: 'sebze',
    icon: 'filiz',
  },
  {
    slug: 'ogun-kaydi',
    title: 'Öğün kaydı ve besinler',
    summary: 'Ölçüler, arama, düzenleme',
    description:
      'Tabağını nasıl anlatacağın, besin kataloğunda arama, kaydı düzenleme ve ' +
      'geçmiş güne dokunma.',
    accent: 'tahil',
    icon: 'kase',
  },
  {
    slug: 'afi',
    title: 'Afi',
    summary: 'Fotoğraf ve sorular',
    description:
      'Sofra arkadaşın Afi: yemeği fotoğraftan tanıması, sorularını yanıtlaması ve ' +
      'sınırlarının nerede başladığı.',
    accent: 'protein',
    icon: 'afi',
  },
  {
    slug: 'denge-ritim',
    title: 'Denge, ritim ve alışkanlık',
    summary: 'Beş grup, afiyet günü, hafta',
    description:
      'Beş besin grubu, günün nasıl dengelendiği, afiyet günü sayımı ve ' +
      'hatırlatmaların ayarı.',
    accent: 'meyve',
    icon: 'ritim',
  },
  {
    slug: 'soframiz',
    title: 'Soframız',
    summary: 'Aile ve arkadaş grupları',
    description:
      'Grup kurma, davet etme, katılma ve grupta kimin neyi gördüğü. Kıyas ve ' +
      'sıralama yok.',
    accent: 'sut',
    icon: 'sofra',
  },
  {
    slug: 'hesap-gizlilik',
    title: 'Hesap, gizlilik ve veri',
    summary: 'Giriş, veri, hesap silme',
    description:
      'Giriş ve şifre işlemleri, verinin nerede durduğu, neyin toplanmadığı ve ' +
      'hesabını silmenin yolları.',
    accent: 'neutral',
    icon: 'kalkan',
  },
  {
    slug: 'beta-sorun-giderme',
    title: 'Beta, sürüm ve sorun giderme',
    summary: 'Davet, güncelleme, takılmalar',
    description:
      'Beta nasıl işliyor, sürüm nasıl güncelleniyor, bir şey takıldığında ne ' +
      'yapmalı ve hatayı bize nasıl iletirsin.',
    accent: 'neutral',
    icon: 'pusula',
  },
]

export function supportCategory(slug: string): SupportCategory | null {
  return SUPPORT_CATEGORIES.find((category) => category.slug === slug) ?? null
}
