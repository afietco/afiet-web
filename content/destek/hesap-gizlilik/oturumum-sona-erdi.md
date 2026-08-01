---
slug: oturumum-sona-erdi
title: "Oturumun sona erdi uyarısı neden çıkıyor?"
description: "Uygulamanın seni giriş ekranına düşürmesinin nedenleri, verilerine bir şey olup olmadığı ve sık sık tekrarlıyorsa ne yapman gerektiği."
updated: 2026-08-01
order: 11
keywords: [oturum, oturumun sona erdi, çıkış attı, yeniden giriş, güvenlik]
related: [hesap-gizlilik/cikis-yapmak, beta-sorun-giderme/bir-sey-takildiginda]
---

Uygulamayı açtığında giriş ekranında **Oturumun sona erdi** başlıklı bir kutu görüyorsan, oturumun sunucu tarafında geçerliliğini yitirmiş demektir. Kutu şunu söyler: güvenliğin için yeniden giriş yapman gerekiyor, girişten sonra kaldığın yere döneceksin.

## Verilerime bir şey oldu mu

Hayır. Bu bir kayıp değil, bir kapı kilidi. Öğünlerin, ölçülerin, profilin ve grup bağlantıların sunucuda duruyor. Giriş yaptığın anda hepsi yerinde olacak.

## Neden oluyor

- **Şifreni başka bir cihazda değiştirdin.** Şifre değişince diğer cihazlardaki oturumlar güvenlik için kapatılır.
- **Oturum sunucuda kapatıldı.** Başka bir cihazdan çıkış yapmış olabilirsin.
- **Oturum anahtarın artık geçerli değil.** Uzun süre kullanılmayan bir oturum bu duruma düşebilir.

```ipucu
Geçici bağlantı sorunları bu uyarıyı çıkarmaz. İnternetin gittiğinde ya da sunucuya ulaşılamadığında oturumun kapanmaz; uygulama sonraki denemede kendi kendine toparlanır.
```

## Ne yapmalıyım

Aynı ekranda e-posta ve şifrenle (ya da Apple veya Google düğmesiyle) yeniden giriş yap. Giriş sonrası uygulama seni bıraktığın ekrana götürür.

## Sık sık tekrarlıyorsa

Arka arkaya birkaç kez çıkıyorsan, bu beklenen bir davranış değil. Şunlara bak:

- Uygulamanın güncel sürümünde misin?
- Şifreni yakın zamanda değiştirdin mi? İlk çıkıştan sonra tekrarlamaması gerekir.

Devam ediyorsa bize yaz: [destek@afiet.co](mailto:destek@afiet.co). Ne zaman olduğunu ve telefon modelini eklersen daha hızlı buluruz. [Bir şey takıldığında](/destek/beta-sorun-giderme/bir-sey-takildiginda) yazısında ne göndermenin işe yaradığı anlatılıyor.

## Güvenlik tarafı

Oturum anahtarların cihazının güvenli deposunda tutulur ve çıkışta silinir. Şifreni ne uygulama ne de afiet ekibi görür; kimlik doğrulama Stack Auth tarafından sağlanır.

Ayrıntılar [Gizlilik Politikası](/gizlilik) sayfasındadır.
