import type { DestekKategori } from '#shared/types/destek'

/**
 * Destek merkezinin kategori seti. Yazılar `content/destek/<kategori>/<slug>.md`
 * dosyalarında yaşar; kategori listesi burada, kodda durur çünkü nadiren değişir
 * ve sıra, renk, açıklama gibi alanları tasarım kararıdır.
 *
 * Aksan anahtarları uygulamadaki besin grubu renklerinin aynısıdır
 * (main.css > @theme). İlk beş kategori ürün konularıdır ve renk taşır; son
 * ikisi bilinçli olarak nötrdür, çünkü türü farklıdır (yasal ve teknik).
 *
 * Kategori slug'ı bir kez yayınlandıktan sonra DEĞİŞTİRİLMEZ: adres
 * `/destek/<kategori>/<slug>` ve panelin yönlendirme tablosu buna dayanır.
 */
export const DESTEK_KATEGORILER: DestekKategori[] = [
  {
    slug: 'baslangic',
    baslik: 'Başlangıç',
    ozet: 'Kurulumdan ilk güne',
    aciklama:
      'afiet’i ilk kez açıyorsan buradan başla: kurulum, hesap, profil ve ' +
      'sofranın ölçü diliyle tanışma.',
    aksan: 'sebze',
    ikon: 'filiz',
  },
  {
    slug: 'ogun-kaydi',
    baslik: 'Öğün kaydı ve besinler',
    ozet: 'Ölçüler, arama, düzenleme',
    aciklama:
      'Tabağını nasıl anlatacağın, besin kataloğunda arama, kaydı düzenleme ve ' +
      'geçmiş güne dokunma.',
    aksan: 'tahil',
    ikon: 'kase',
  },
  {
    slug: 'afi',
    baslik: 'Afi',
    ozet: 'Fotoğraf ve sorular',
    aciklama:
      'Sofra arkadaşın Afi: yemeği fotoğraftan tanıması, sorularını yanıtlaması ve ' +
      'sınırlarının nerede başladığı.',
    aksan: 'protein',
    ikon: 'afi',
  },
  {
    slug: 'denge-ritim',
    baslik: 'Denge, ritim ve alışkanlık',
    ozet: 'Beş grup, afiyet günü, hafta',
    aciklama:
      'Beş besin grubu, günün nasıl dengelendiği, afiyet günü sayımı ve ' +
      'hatırlatmaların ayarı.',
    aksan: 'meyve',
    ikon: 'ritim',
  },
  {
    slug: 'soframiz',
    baslik: 'Soframız',
    ozet: 'Aile ve arkadaş grupları',
    aciklama:
      'Grup kurma, davet etme, katılma ve grupta kimin neyi gördüğü. Kıyas ve ' +
      'sıralama yok.',
    aksan: 'sut',
    ikon: 'sofra',
  },
  {
    slug: 'hesap-gizlilik',
    baslik: 'Hesap, gizlilik ve veri',
    ozet: 'Giriş, veri, hesap silme',
    aciklama:
      'Giriş ve şifre işlemleri, verinin nerede durduğu, neyin toplanmadığı ve ' +
      'hesabını silmenin yolları.',
    aksan: 'notr',
    ikon: 'kalkan',
  },
  {
    slug: 'beta-sorun-giderme',
    baslik: 'Beta, sürüm ve sorun giderme',
    ozet: 'Davet, güncelleme, takılmalar',
    aciklama:
      'Beta nasıl işliyor, sürüm nasıl güncelleniyor, bir şey takıldığında ne ' +
      'yapmalı ve hatayı bize nasıl iletirsin.',
    aksan: 'notr',
    ikon: 'pusula',
  },
]

export function destekKategori(slug: string): DestekKategori | null {
  return DESTEK_KATEGORILER.find((k) => k.slug === slug) ?? null
}
