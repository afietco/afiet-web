import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.NUXT_DATABASE_URL)
const q = (t, s) => sql.query(s).then(r => console.log('\n### '+t+'\n'+JSON.stringify(r))).catch(e=>console.log('\n### '+t+' HATA: '+e.message))
await q('GSC 28g toplam', `select sum(clicks) tik, sum(impressions) g, min(metric_date) ilk, max(metric_date) son from gsc_rows where metric_date > current_date-28 and dimension='query'`)
await q('GSC top sorgu', `select key, sum(clicks) tik, sum(impressions) g, round(avg(position)::numeric,1) poz from gsc_rows where metric_date > current_date-28 and dimension='query' group by 1 order by g desc limit 20`)
await q('GSC indeks durum', `select state, count(*) n from gsc_index_status group by 1 order by n desc`)
await q('GSC son tarama', `select date_trunc('day',last_crawl_at)::date g, count(*) n from gsc_index_status where last_crawl_at is not null group by 1 order by 1 desc limit 14`)
await q('Googlebot son tarama ozeti', `select max(last_crawl_at) enson, count(*) filter (where last_crawl_at > now()-interval '7 days') hafta, count(*) toplam from gsc_index_status`)
