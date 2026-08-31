// Si la URL es una miniatura de Google Drive (drive.google.com/thumbnail?id=...),
// permite pedirla en un ancho distinto (más chica para tarjetas de catálogo,
// más grande para la ficha de producto). Con cualquier otra URL la deja tal cual.
export function conAncho(url, ancho) {
  if (!url) return url
  const match = url.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/)
  if (!match) return url
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${ancho}`
}
