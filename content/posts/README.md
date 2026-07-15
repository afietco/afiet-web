# content/posts

Blog yazılarının markdown YEDEKLERİ. Runtime kaynağı Neon'daki `blog_posts`
tablosudur — site bu klasörden değil, veritabanından okur.

Akış (panel → Claude Code):

1. Yönetim panelindeki İçerik bölümünden "Üretim promptunu kopyala".
2. Claude yazıyı `content/posts/<slug>.md` olarak buraya yazar (frontmatter'lı).
3. Onay sonrası: `node scripts/publish-post.mjs content/posts/<slug>.md`
   — script hedef Neon host'unu gösterip onay ister, yazıyı upsert eder,
   bağlı panel içeriğini "yayında" yapar. Deploy gerekmez (~2 dk'da canlı).
4. md dosyası `feat: blog — <başlık>` commit'iyle repoya girer (sürümlü yedek).

Düzeltme = dosyayı düzenle + script'i yeniden çalıştır (idempotent upsert).
Yayından kaldırma: `node scripts/publish-post.mjs --unpublish <slug>`.

Frontmatter şeması ve SEO/GEO kuralları paneldeki prompt şablonundadır
(afiet-admin `src/views/content/prompt.ts`).
