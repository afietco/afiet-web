---
slug: kesinti-mi-var-durum-sayfasi
title: "Bir kesinti mi var? Durum sayfasını okumak"
description: "afiet.co/durum sayfasında hangi servislerin göründüğü, renklerin ve durumların ne anlama geldiği ve kesinti sırasında yapman gerekmeyen şeyler."
updated: 2026-08-01
order: 12
keywords: [kesinti, durum, çalışmıyor, sunucu, arıza, durum sayfası, yavaşlama]
related: [sorun-giderme/bir-sey-takildiginda, sorun-giderme/uygulama-acilmiyor-ya-da-takiliyor]
---

Sorunun sende mi bizde mi olduğunu [afiet.co/durum](/durum) sayfası söyler. Sayfa afiet'in çalıştığı yerden başka bir yerde durur, yani biz kesintideyken bile açılır.

## Uygulama da sana söyler

Bir ekran veriyi getiremediğinde iki cümleden birini görürsün ve ikisi farklı şey anlatır:

- **"Sorun sende değil"** Aksaklık bizdedir. Uygulama neyin etkilendiğini de yazar ve altında bir **Durum sayfası** bağlantısı gösterir.
- **"Bağlantı kurulamadı"** Bilinen bir kesinti yok. Bağlantını kontrol edip birazdan yeniden deneyebilirsin.

## Sayfada ne var

- **En üstte tek cümlelik genel durum** ve son kontrol saati. Servisler beş dakikada bir denetlenir.
- **Servisler:** Uygulama sunucusu, Veritabanı, Web sitesi, Afi yapay zekâ, Kimlik doğrulama ve E-posta iletimi. Her biri ayrı ayrı işaretlenir, çünkü çoğu kesinti hepsini birden etkilemez.
- **Doksan günlük şerit:** her gün için bir çizgi ve yanında çalışma oranı. Dar ekranlarda son kırk beş gün gösterilir.
- **Sağlayıcı durumları:** afiet'in üzerinde koştuğu altyapıların kendi durum sayfalarına bağlantılar.
- **Geçmiş olaylar:** son doksan günde yaşanan kesintiler, ne kadar sürdükleri ve nelerin etkilendiği.

Her servisin yanında dört durumdan biri yazar: **Çalışıyor**, **Yavaşlama**, **Kesinti** ve **Veri yok** (henüz ölçüm alınmamış demektir).

## Hangi servis neyi etkiler

- **Uygulama sunucusu** ya da **Veritabanı:** kayıt eklemek, listeleri görmek ve grup ekranları etkilenir.
- **Afi yapay zekâ:** Afi'ye fotoğrafla yemek tanıtmak çalışmaz; besin arayıp elle eklemeye devam edebilirsin.
- **Kimlik doğrulama:** giriş, kayıt ve şifre işlemleri etkilenir.
- **E-posta iletimi:** doğrulama ve sıfırlama e-postaları gecikebilir.
- **Web sitesi:** afiet.co etkilenir, uygulama çalışmaya devam eder.

## Kesinti varken ne yapmalısın

Kısa cevap: beklemek. Uzun cevap da aynı, ama neyi yapmaman gerektiğini söylemek daha faydalı:

```dikkat
Kesinti sırasında çıkış yapmak, başka bir hesapla girmeyi denemek ya da uygulamayı silip yeniden kurmak sorunu çözmez. Çıkış yapmak bu cihazdaki taslakları ve işaretleri temizler, servisi geri getirmez.
```

Kayıtların yerinde durur. Uygulamayı arka plana atıp geri döndüğünde ekran kendi kendine yeniden dener, yani biz toparlandığımız anda o da toparlanır.

## Durum sayfası her şey yolunda diyorsa

O zaman sorun büyük ihtimalle senin bağlantında ya da tek bir ekranda. Sırayla denenecekler [bir şey takıldığında](/destek/sorun-giderme/bir-sey-takildiginda) yazısında; sürerse [destek@afiet.co](mailto:destek@afiet.co) adresine yazabilirsin.
