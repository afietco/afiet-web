import { readAppVersionGate } from '~~/server/utils/appVersionStore'
import type { AppVersionGate } from '#shared/types/appVersion'

/**
 * Mobil uygulamanın açılışta okuduğu sürüm kapısı. Herkese açık; kimlik
 * istemez ve hiçbir şey döndürmediği durum (boş kapı) normal durumdur.
 *
 * Yanıt route kuralıyla 60 sn önbelleklenir: kararı günler ölçeğinde bir
 * bilgi, saniyede bir tazelenmesinin anlamı yok, ama zorunlu bir güncelleme
 * yayına alındığında da bir dakikadan fazla beklemesin.
 */
export default defineEventHandler(async (event): Promise<AppVersionGate> => {
  /* Uygulama native fetch ile okuyor, yani CORS onu ilgilendirmiyor; başlık
     yerel web önizlemesi (expo start --web) tarayıcıdan okuyabilsin diye
     var. Uç zaten tamamen açık ve salt okunur. */
  setHeader(event, 'access-control-allow-origin', '*')
  return readAppVersionGate(event)
})
