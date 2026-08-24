/**
 * Satori element kurucusu. Satori React beklediği için elementler elle
 * kurulur (repoda React yok) ve birden fazla çocuğu olan her kabın
 * `display`ini AÇIKÇA ister; eksikse tüm render'ı hataya düşürür. Varsayılan
 * burada veriliyor: kapak ve story düzenlerinde zaten her kap flex.
 *
 * `/kapak` ve `/story` rotaları aynı kurucuyu paylaşır; Satori tuzağının
 * çözümü iki rotada iki kez yaşamasın diye buraya çıkarıldı.
 */
export const h = (type: string, props: Record<string, unknown>, ...children: unknown[]) => {
  const style = (props.style ?? {}) as Record<string, unknown>
  return {
    type,
    props: {
      ...props,
      ...(type === 'img' ? {} : { style: { display: 'flex', ...style } }),
      children: children.length === 1 ? children[0] : children,
    },
  }
}
