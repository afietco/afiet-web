import { describe, expect, it, vi } from 'vitest'
import { publishStory } from './instagram'

/**
 * publishStory'nin Meta sözleşmesi: container aç → FINISHED bekle → publish.
 * deps.fetch enjekte edilebilir olduğu için gerçek Graph'a dokunmadan üç
 * kritik davranış sabitlenir: çağrı sırası, ERROR'da vazgeçme ve token'ın
 * hata mesajına sızmaması.
 */

const jsonRes = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response

describe('publishStory', () => {
  it('container → durum → publish sırasıyla gider ve media id döner', async () => {
    const calls: string[] = []
    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url)
      calls.push(u)
      if (u.includes('/media_publish')) return jsonRes({ id: 'yayin-1' })
      if (u.includes('status_code')) return jsonRes({ status_code: 'FINISHED' })
      return jsonRes({ id: 'container-1' })
    })
    const id = await publishStory('TOKEN', 'ig-user', 'https://afiet.co/story/x.jpg', { fetch })
    expect(id).toBe('yayin-1')
    expect(calls[0]).toContain('/ig-user/media')
    expect(calls[1]).toContain('container-1')
    expect(calls[2]).toContain('/ig-user/media_publish')
  })

  it('Meta ERROR durumunda publish denemez', async () => {
    const fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes('status_code')) return jsonRes({ status_code: 'ERROR' })
      if (u.includes('/media_publish')) throw new Error('buraya gelinmemeli')
      return jsonRes({ id: 'container-1' })
    })
    await expect(publishStory('TOKEN', 'ig-user', 'https://x/y.jpg', { fetch })).rejects.toThrow('ERROR')
    expect(String(fetch.mock.calls.at(-1)?.[0])).not.toContain('media_publish')
  })

  it('izin hatası mesajı token içermez', async () => {
    const fetch = vi.fn(async () =>
      jsonRes({ error: { type: 'OAuthException', code: 200, message: 'izin yok' } }, false, 403),
    )
    await expect(publishStory('GIZLI-TOKEN', 'ig-user', 'https://x/y.jpg', { fetch })).rejects.toThrow(
      /OAuthException/,
    )
    await expect(publishStory('GIZLI-TOKEN', 'ig-user', 'https://x/y.jpg', { fetch })).rejects.not.toThrow(
      /GIZLI-TOKEN/,
    )
  })
})
