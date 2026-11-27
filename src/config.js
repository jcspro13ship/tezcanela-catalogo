// Número de WhatsApp del negocio, con código de país (57 = Colombia), sin + ni espacios
export const WHATSAPP_NUMBER = '573158401256'

// Apps Script publicado sobre el Google Sheet del inventario (ver docs/INSTRUCTIVO_TECNICO.md).
// Mientras esté vacío, el sitio usa los datos de ejemplo en src/data/.
// (VITE_SHEETS_API_URL solo se usa en pruebas locales con un servidor simulado.)
export const SHEETS_API_URL =
  import.meta.env.VITE_SHEETS_API_URL ||
  'https://script.google.com/macros/s/AKfycbzYY0uBUlxr4okQ-kR0t1R1HS4q4YUZYj9HZVCWlcdcrTsoQ1I9zzW4mIcpIDmdBCfXOw/exec'

// Cloudinary: donde se guardan las fotos de los productos nuevos que se crean desde el panel.
// El "preset" es de subida sin firma (no contiene ningún secreto).
export const CLOUDINARY_CLOUD = 'sa0ainfh'
export const CLOUDINARY_PRESET = 'tezcanela_catalogo'
export const CLOUDINARY_UPLOAD_URL =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_URL || `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

export const EMPRESA = {
  nombre: 'Tez Canela',
  eslogan: 'Moda que refleja tu esencia',
  // Texto de presentación que aparece arriba del catálogo (cada elemento es un párrafo).
  presentacion: [
    'En Tez Canela somos buscadores de la esencia de la mujer vallecaucana.',
    'Desde hace 33 años, somos inspiración, seguridad y confianza para la mujer, exaltando su clase, su elegancia y belleza.',
  ],
}

// Video de portada del catálogo (dirección de Cloudinary). Vacío = sin video.
// Se reproduce solo, sin sonido y en bucle; la persona puede activar el sonido.
// Original: "Video Inicio.mov" (vertical 1080x1920, 22 s, 32 MB, HEVC). Cloudinary lo entrega
// convertido a MP4 H.264 de 720 px (~6 MB), que se reproduce en todos los celulares y navegadores.
const VIDEO_BASE = 'https://res.cloudinary.com/sa0ainfh/video/upload'
export const VIDEO_PORTADA = `${VIDEO_BASE}/w_720,q_auto:eco,vc_h264,ac_aac/v1795783308/tezcanela/portada_inicio.mp4`
export const VIDEO_PORTADA_IMAGEN = `${VIDEO_BASE}/so_1,w_720,q_auto/v1795783308/tezcanela/portada_inicio.jpg` // se ve mientras carga
