import { reducirImagen, subirFoto } from './cloudinary'

// Sube a Cloudinary las fotos nuevas de la lista (las que aún no tienen url) y
// devuelve las direcciones de TODAS, en el mismo orden. Las que ya estaban
// subidas no se repiten. Si una falla, lanza error y las anteriores quedan marcadas.
export async function subirPendientes(fotos, idBase, onProgreso, onSubida) {
  const urls = []
  for (let i = 0; i < fotos.length; i++) {
    const f = fotos[i]
    if (f.url) {
      urls.push(f.url)
      continue
    }
    onProgreso(`Subiendo foto ${i + 1} de ${fotos.length}…`)
    const blob = await reducirImagen(f.file)
    const url = await subirFoto(blob, `tezcanela/${idBase}_${Date.now().toString(36)}_${i + 1}`)
    onSubida(f.key, url)
    urls.push(url)
  }
  return urls
}
