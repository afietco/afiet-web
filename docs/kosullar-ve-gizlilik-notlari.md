# /kosullar sayfası ve gizlilik güncellemesi notları

> Durum: BRIEF (5 Ağu 2026). Kod yok, ne yazılacağının kaydı.
> Tetikleyen iş: mobil uygulamaya abonelik (in-app purchase) geliyor.
> İlgili: `afiet-mobile/docs/abonelik-kurulumu.md`, `fiyatlandirma.md`.

İki iş var: **yeni `/kosullar` sayfası** ve **mevcut `/gizlilik` sayfasının
güncellenmesi**. İkisi de mağaza incelemesinin önkoşulu, ikisi de mobil
paywall'dan link verilecek.

---

## A. Neden acil

- **App Store Review 3.1.2**: abonelik satan bir uygulamanın paywall'ında hem
  gizlilik politikası hem **kullanım koşulları (EULA)** bağlantısı bulunmak
  zorunda. Bugün `afiet.co/kosullar` **404** veriyor. Paywall'dan 404'e giden
  bir link net red sebebi.
- **App Store Connect metadata**: aynı bağlantı uygulama sayfasının
  açıklamasında ya da EULA alanında da isteniyor.
- **Play**: abonelik içeren uygulamanın açıklamasında fiyat, süre, otomatik
  yenileme ve iptal yolu yazılı olmalı; koşullar sayfası bunun dayanağı.

## B. `/kosullar` sayfasında bulunması gerekenler

Nuxt sayfası, `app/pages/kosullar.vue`, içerik `app/data/content.ts` içinde
`terms` adlı bir export olarak (mevcut `privacy` exportuyla aynı desen).
Footer'a link eklenecek. Yürürlük tarihi görünür olmalı.

### 1. Taraflar ve kapsam
- Hizmeti veren: afiet (şahıs şirketi), iletişim `destek@afiet.co`.
- Kapsam: afiet mobil uygulaması ve afiet.co.
- Sözleşmenin kabulü: uygulamayı kullanmakla kabul edilmiş sayılır.

### 2. Hizmetin tanımı ve sağlık uyarısı (en kritik madde)
- afiet bir beslenme alışkanlığı uygulamasıdır.
- **afiet tıbbi cihaz değildir; tanı koymaz, tedavi ya da diyet reçetesi
  vermez.** Afi asistanları yapay zekâdır, yanılabilir ve hiçbiri doktor,
  diyetisyen ya da terapist yerine geçmez.
- Hamilelik, kronik hastalık, yeme bozukluğu gibi durumlarda uzmana danışma
  çağrısı.
- Acil durum uyarısı: ruhsal sıkıntıda uygulama değil, yetkili sağlık
  hizmetleri.

Bu bölüm sadece hukuk için değil: mağaza incelemesinde "sağlık iddiası"
şüphesini kesen metin burası.

### 3. Hesap
- 18 yaş sınırı (Play'de hedef kitleyi 18+ seçiyoruz, tutarlı olmalı).
- Hesap güvenliği kullanıcının sorumluluğunda.
- Hesabın kapatılması ve verinin silinmesi: uygulama içinden ve
  `/hesap-sil` üzerinden.

### 4. Abonelik koşulları (yeni ve en uzun bölüm)
Şunların hepsi açıkça yazılacak:
- **Ücretsiz kısım**: çekirdek özellikler süresiz ücretsiz.
- **Premium neyi açar**: Afi sohbet hakkının genişlemesi, derin içgörü,
  ikram kesesi. Sayılar burada verilmeyecek (değişebilir), "uygulamada
  gösterilen güncel haklar" denecek.
- **Fiyat ve süre**: aylık 129,99 TL, yıllık 799,99 TL. Yıllıkta ilk yıl için
  giriş teklifi (599,99 TL) uygulanabileceği, bunun bir defaya mahsus olduğu.
- **Otomatik yenileme**: dönem bitiminden en az 24 saat önce iptal
  edilmezse otomatik yenilenir; ücret dönem bitiminden önceki 24 saat içinde
  tahsil edilir.
- **İptal yolu**: iOS'ta Ayarlar > Apple hesabı > Abonelikler, Android'de
  Google Play > Abonelikler. **İptalin uygulama içinden yapılamayacağı**,
  mağaza üzerinden yapıldığı açıkça yazılmalı.
- **Satıcı sıfatı**: satış Apple ve Google üzerinden gerçekleşir; ödeme,
  fatura ve iade süreçleri ilgili mağazanın koşullarına tabidir. Bu cümle
  hem hukuken doğru hem de iade taleplerini doğru adrese yönlendirir.
- **İade**: iade talepleri mağazaya yapılır (Apple: reportaproblem.apple.com,
  Google: Play Store sipariş geçmişi). afiet doğrudan iade yapamaz.
- **Fiyat değişikliği**: fiyat değişirse mevcut abonelere mağaza kuralları
  gereğince önceden bildirileceği.
- **Beta ve kurucu jesti**: beta katılımcılarına verilen 1 yıllık premium'un
  ücretsiz ve tek seferlik bir jest olduğu, otomatik yenilenmeyeceği.
- **Adil kullanım**: premium hakların kötüye kullanıma karşı makul bir üst
  sınırı olduğu, sınıra yaklaşıldığında hizmetin yavaşlatılabileceği ama
  kesilmeyeceği.

> Not: "sınırsız" kelimesi bu sayfada da, uygulamada da **kullanılmayacak**
> (5 Ağu 2026 kararı). Premium hakları görünür ve sonlu.

### 5. Mesafeli satış ve cayma hakkı
- 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler
  Yönetmeliği çerçevesinde: elektronik ortamda anında ifa edilen hizmetlerde
  cayma hakkı istisnası bulunduğu, ancak mağaza politikalarının daha geniş
  iade imkânı sunabileceği.
- Satış mağaza üzerinden yapıldığı için mesafeli satış sözleşmesinin
  tarafının ilgili mağaza olduğu.

### 6. Kullanım kuralları
- Kötüye kullanım, otomatik erişim, tersine mühendislik yasağı.
- Gruplarda paylaşılan içerikten kullanıcının sorumlu olması.
- Hesabın askıya alınabileceği haller.

### 7. Fikri mülkiyet
- Uygulama, içerik, besin kataloğu ve marka afiet'e aittir.
- Kullanıcının girdiği veriler kullanıcıya aittir.

### 8. Sorumluluğun sınırı
- Hizmetin "olduğu gibi" sunulduğu, kesintisizlik garantisi verilmediği.
- Yapay zekâ çıktılarının doğruluğunun garanti edilmediği.

### 9. Değişiklikler, uygulanacak hukuk, uyuşmazlık
- Koşulların değişebileceği ve yürürlük tarihinin sayfada tutulacağı.
- Türk hukuku; tüketici hakem heyetleri ve tüketici mahkemeleri yetkili.

### 10. Muhasebe ve vergi notu (iç bilgi, sayfada teknik detay verilmez)
Muhasebeci ile görüşüldü, faaliyet alanı ve vergilendirme süreci yürüyor
(bkz. `afiet-mobile` hafızasındaki şahıs şirketi notu). Sayfaya yansıyacak
tek şey: **satıcı sıfatının mağazalarda olduğu** ve **faturanın mağazadan
alındığı**. Şirket unvanı, vergi dairesi ve adres bilgisi sayfada yer alacaksa
muhasebeciden birebir doğru yazımı alınmalı; eksik ya da yanlış unvan
tüketici mevzuatı açısından sorun yaratır.

---

## C. `/gizlilik` sayfasında eksik olanlar

Mevcut metin iyi durumda (yürürlük 31 Tem 2026, `app/data/content.ts`
içindeki `privacy` export'u). Fotoğraf gönderimi, Sentry, push adresi, web
analitiği ve afiet.co'daki "Afi'ye sor" zaten anlatılmış. Kod denetiminde
**dört eksik** çıktı:

1. **Uygulama içi Afi sohbetlerinin sunucuda saklanması.**
   En önemlisi bu. Mevcut metin yalnız web'deki "Afi'ye sor"u anlatıyor.
   Oysa uygulamadaki üç asistanla yapılan sohbetler artık sunucuda tutuluyor
   (`chat_sessions`, `chat_turns` tabloları; soru ve cevap metniyle birlikte).
   Eklenecek bölüm şunları söylemeli:
   - sohbetler hesaba bağlı saklanır ki cihaz değişince kaybolmasın,
   - saklanan şey kişinin yazdığı ve Afi'nin yazdığıdır; bunlardan çıkarılmış
     özet, puan ya da etiket üretilmez,
   - cevabı üretmek için Azure'un Avrupa bölgesindeki servise iletilir ve
     orada model eğitiminde kullanılmaz,
   - hesap silinince sohbetler de silinir,
   - **destek sohbeti** ruh sağlığına değebildiği için ayrı ve açık rıza ile
     açılır, rıza geri alınabilir (uygulamada bu mekanizma var).
2. **Abonelik ve ödeme verisi.** Paywall çıkmadan eklenmeli:
   - satın alma Apple/Google üzerinden yapılır, kart bilgisi afiet'e ulaşmaz,
   - abonelik durumunu yönetmek için RevenueCat hizmeti kullanılır ve ona
     giden şey mağaza satın alma kaydı ile hesap kimliğidir,
   - abonelik durumu kendi sunucumuzda da tutulur.
3. **Davranış telemetrisi.** Mevcut metin "kayıt tarihlerin ve seri" diyor;
   gerçekte uygulama içi olay telemetrisi bundan geniş (ekran görüntülenmeleri,
   oturum kayıtları, `POST /v1/events`). Cümle dürüstçe genişletilmeli:
   hangi ekranların kullanıldığı, uygulamanın nerede takıldığı; reklam ya da
   profilleme için değil, ürünü düzeltmek için.
4. **Gruplar.** Bir gruba katılınca grup üyelerinin neyi görebildiği (ad,
   ritim, kutlamalar) ve neyi göremediği açıkça yazılmalı. Bugünkü metinde
   grup paylaşımı hiç geçmiyor.

Yürürlük tarihi güncellenecek ve mobil uygulamadaki gizlilik bağlantısının
aynı sayfaya gittiği doğrulanacak.

---

## D. Web tarafında ayrıca kontrol edilecekler

- **Footer**: `/kosullar` bağlantısı eklenmeli (gizlilik ve hesap-sil zaten
  var).
- **Destek merkezi** (`/destek`): abonelik için en az üç yazı gerekecek:
  "afiet premium nedir", "aboneliğimi nasıl iptal ederim" (iOS ve Android
  ayrı ayrı, ekran adlarıyla), "ödeme ve iade". Mağaza incelemecisi de,
  kullanıcı da önce buraya bakıyor.
- **`/beta` sayfası**: beta katılımcılarına 1 yıl ücretsiz premium sözü
  verilecekse sayfada yazılı olmalı, sonradan eklenen bir vaat güveni bozar.
- **Fiyatın web'de görünmesi**: mağaza fiyatı değişince web'deki sayı bayat
  kalır. Fiyatı web'e yazacaksak tek yerden, "güncel fiyat uygulamada
  gösterilir" notuyla yazılmalı.
