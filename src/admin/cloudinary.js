import { CLOUDINARY_PRESET, CLOUDINARY_UPLOAD_URL } from '../config'

// Reduce la foto antes de subirla (las fotos de celular pesan 3–8 MB): lado mayor
// de 1600 px y JPEG. Así la subida es rápida y el catálogo carga ligero.
// Si el navegador no puede procesarla, se sube tal cual.
export async function reducirImagen(archivo, ladoMax = 1600) {
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
    const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(bmp.width * escala)
    lienzo.height = Math.round(bmp.height * escala)
    const ctx = lienzo.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lienzo.width, lienzo.height)
    ctx.drawImage(bmp, 0, 0, lienzo.width, lienzo.height)
    const blob = await new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.85))
    return blob || archivo
  } catch {
    return archivo
  }
}

// Sube una foto a Cloudinary y devuelve su dirección (https://res.cloudinary.com/...).
export async function subirFoto(blob, publicId) {
  const datos = new FormData()
  datos.append('file', blob)
  datos.append('upload_preset', CLOUDINARY_PRESET)
  datos.append('public_id', publicId)
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: datos })
  const json = await res.json()
  if (!res.ok || !json.secure_url) throw new Error((json.error && json.error.message) || 'No se pudo subir la foto.')
  return json.secure_url
}
