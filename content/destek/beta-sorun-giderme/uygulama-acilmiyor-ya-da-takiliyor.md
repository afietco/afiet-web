---
slug: uygulama-acilmiyor-ya-da-takiliyor
title: "Uygulama açılmıyor, donuyor ya da hata ekranı gösteriyor"
description: "Boş ekranda kalma, donma ve karşına çıkan üç farklı hata ekranı: her birinin ne anlama geldiği, hangi düğmeye dokunacağın ve sırayla denenecekler."
updated: 2026-08-01
order: 11
keywords: [açılmıyor, donuyor, boş ekran, beyaz ekran, hata ekranı, çöküyor, kapanıyor]
related: [beta-sorun-giderme/bir-sey-takildiginda, beta-sorun-giderme/kesinti-mi-var-durum-sayfasi]
---

Uygulama bir yerde takılırsa kayıtların gitmez; kayıtlar hesabına bağlı olarak sunucuda durur. Aşağıdaki adımlar çoğu takılmayı birkaç dakikada çözer.

## Önce şu ikisi

1. **Uygulamayı tamamen kapat ve yeniden aç.** Arka planda bırakmak yetmez; uygulama listesinden kapatman gerekir.
2. **Güncel sürümde olduğundan emin ol.** TestFlight'ta afiet'in yanında "Güncelle" yazıyorsa güncelle. Adımlar [TestFlight'ta güncelleme](/destek/beta-sorun-giderme/testflight-guncelleme) yazısında.

## Karşına çıkan ekranı tanı

Bir şey ters gittiğinde uygulama seni boş bir ekranda bırakmaz. Ne kadarının etkilendiğine göre üç ayrı ekran vardır ve üçünde de yapman gereken şey ekrandaki düğmeye dokunmaktır.

- **"Afi bir anlığına takıldı."** Uygulamanın tamamı etkilenmiştir. **Tekrar dene**'ye dokun. Aynı ekran ısrarla geri geliyorsa altındaki **"Sorun sürüyorsa çıkış yap ve yeniden başla"** satırı seni giriş ekranına çıkarır. Bu düğme kayıtlarını silmez, yalnız bu cihazdaki oturumu kapatır; aynı hesapla girdiğinde her şey yerinde olur.
- **"Bu sayfayı açamadım"** Yalnız o sekme etkilenmiştir. **Tekrar dene** ya da **Geri dön** ile devam edebilirsin.
- **"Bu adımı açamadım"** Aşağıdan açılan bir sayfanın tek bir adımı takılmıştır. **Tekrar dene**'ye dokunmak çoğunlukla yeter, sayfayı kapatman gerekmez.

```ipucu
Sayfa ve adım ekranları "kayıtların yerinde duruyor" der; bu bir teselli cümlesi değil, olanın tarifidir. Kayıtlar cihazda tutulmadığı için uygulamanın takılması onlara ulaşamaz.
```

## Açılışta boş ya da yükleme ekranında kalıyorsa

Uygulama açılırken veriyi bekler. Bekleme uzarsa ekran kendini bırakır ve **Tekrar dene** düğmesiyle birlikte ne olduğunu söyleyen bir mesaj gösterir:

- **"Sorun sende değil"** yazıyorsa aksaklık bizdedir. Beklemek dışında yapman gereken bir şey yok; ayrıntı için [bir kesinti mi var](/destek/beta-sorun-giderme/kesinti-mi-var-durum-sayfasi) yazısına bak.
- **"Bağlantı kurulamadı"** yazıyorsa bağlantı tarafına bakalım: Wi-Fi'dan mobil veriye geçmeyi dene.

Uygulamayı arka plana atıp geri döndüğünde ekran kendi kendine yeniden dener, yani biz toparlandığımızda ekran da toparlanır.

```dikkat
Uygulamayı silip yeniden kurmak son çare bile değildir; giriş bilgilerin cihazda kalabildiği için çoğu durumda bir şeyi değiştirmez. Önce yukarıdaki adımları dene, sonra bize yaz.
```

## Hâlâ sürüyorsa

Uygulama beklenmedik biçimde kapandıysa teknik kayıt bize otomatik ulaşır. Yine de [destek@afiet.co](mailto:destek@afiet.co) adresine hangi ekranda olduğunu ve hemen öncesinde ne yaptığını yazman bizim için değerli. Eklemen gerekenlerin tamamı [bir şey takıldığında](/destek/beta-sorun-giderme/bir-sey-takildiginda) yazısının sonunda.
