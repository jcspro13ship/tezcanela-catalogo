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
}
