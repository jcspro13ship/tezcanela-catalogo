# Instructivo técnico — Tez Canela Catálogo

Guía paso a paso para montar y publicar el sitio. Sigue el orden: cada paso depende del anterior.

## 0. Cómo está armado

```
Google Sheet (inventario)
      │  (lo edita cualquiera, sin saber programar)
      ▼
Apps Script publicado como "Web App"
      │  (expone el Sheet como datos JSON)
      ▼
Sitio React (este repo)
      │  (lee esos datos al cargar la página)
      ▼
GitHub Pages + dominio propio del cliente
```

Mientras no se conecte el Sheet, el sitio usa datos de ejemplo (`src/data/productos.js` y `src/data/variantes.js`) para poder seguir desarrollando sin esperar el inventario real.

---

## 1. Crear el Google Sheet

Ya existe un Excel armado con la estructura exacta y datos de ejemplo: [`docs/TezCanela_Inventario_Base.xlsx`](TezCanela_Inventario_Base.xlsx). Es más rápido partir de ahí que crear las pestañas a mano:

1. Entra a [sheets.google.com](https://sheets.google.com) → **Archivo → Importar → Subir** y selecciona `TezCanela_Inventario_Base.xlsx`.
2. Elige **"Insertar nuevas hojas"** (o "Reemplazar hoja de cálculo" si es un Sheet recién creado y vacío).
3. Queda un Google Sheet con 3 pestañas: `Léeme` (instrucciones), `Productos` y `Variantes`, ya con datos de ejemplo cargados (los mismos que trae el sitio por defecto).
4. Borra las filas de ejemplo y carga el inventario real cuando esté listo (ver `docs/MANUAL_INVENTARIO.docx`).
5. Comparte el Sheet con quien vaya a mantenerlo (Fanny y su equipo) con permiso de edición.

Si en algún momento prefieres armar la estructura desde cero en vez de importar el Excel, estas son las columnas exactas que debe tener cada pestaña (mayúsculas/minúsculas importan):

### Pestaña `Productos`

| id | nombre | categoria | descripcion | precio | imagen | activo |
|----|--------|-----------|-------------|--------|--------|--------|
| p1 | Vestido Amelia | Vestidos | Vestido midi de manga larga... | 189000 | (vacío o URL de foto) | VERDADERO |

- `id`: identificador único y corto, sin espacios (p1, p2, p3...).
- `precio`: número sin puntos ni signo de pesos (ej. `189000`).
- `imagen`: se puede dejar vacío mientras no haya fotos; el sitio muestra un placeholder con el nombre del producto. Cuando haya foto, pegar ahí la URL pública de la imagen.
- `activo`: `VERDADERO` para que aparezca en el catálogo, `FALSO` para ocultarlo sin borrar la fila.

### Pestaña `Variantes`

| producto_id | sku | talla | color | stock |
|-------------|-----|-------|-------|-------|
| p1 | p1-NEG-M | M | Negro | 6 |

- `producto_id`: debe coincidir exactamente con el `id` de la pestaña Productos.
- `sku`: código único de esa combinación talla-color (puede ser el que ya maneje el negocio, o simplemente `id-color-talla`).
- Una fila por cada combinación talla-color que exista de ese producto.

### Pestaña `Imagenes` (varias fotos por producto)

Cada producto puede tener una o más fotos (con modelo, sin modelo, detalle de tela, etc.). Una fila por foto:

| producto_id | orden | url |
|-------------|-------|-----|
| p1 | 1 | https://res.cloudinary.com/sa0ainfh/image/upload/v.../tezcanela/p1_modelo.jpg |
| p1 | 2 | https://res.cloudinary.com/sa0ainfh/image/upload/v.../tezcanela/p1_plana.jpg |

- `producto_id`: igual que en Variantes, debe coincidir con el `id` de Productos.
- `orden`: número que define en qué posición aparece esa foto (1 = portada, la que se ve en el catálogo).
- `url`: link público de la imagen, **subida a Cloudinary** (ver siguiente sección — no usar links de Google Drive).
- Si un producto no tiene ninguna fila en esta pestaña, el sitio revisa si la columna `imagen` de Productos (formato anterior) tiene algo cargado, y si no, muestra el placeholder con el nombre del producto.

#### ⚠️ Por qué las fotos van en Cloudinary y no en Google Drive

Al probar el catálogo con fotos reales, encontramos que **Google Drive bloquea que sus imágenes se muestren incrustadas (`<img>`) en un sitio externo**, aunque el archivo esté compartido como "público". El link de Drive abre bien si lo pegas solo en el navegador, pero falla silenciosamente cuando el sitio intenta mostrarlo como foto — por eso las primeras pruebas con fotos de Drive fallaron. Drive no está pensado para esto; **Cloudinary sí**.

**Cómo subir una foto nueva a Cloudinary (2 minutos, sin conocimientos técnicos):**

1. Entra a [cloudinary.com](https://cloudinary.com) e inicia sesión con la cuenta del proyecto (cloud name: `sa0ainfh`).
2. En el menú, ve a **Media Library**.
3. Arrastra la foto (o varias) a la ventana, o usa el botón **Upload**.
4. Cuando termine de subir, haz clic en la foto → copia el link que dice **"Copy URL"** (debe verse como `https://res.cloudinary.com/sa0ainfh/image/upload/.../archivo.jpg`).
5. Pega ese link en la columna `url` de la pestaña `Imagenes`, en la fila del producto correspondiente.

No hace falta redimensionar ni comprimir la foto antes de subirla — el sitio le pide a Cloudinary el tamaño que necesita en cada caso (miniatura, foto grande) automáticamente.

> El instructivo simple para cargar productos día a día (pensado para el equipo de Fanny) está en `docs/MANUAL_INVENTARIO.docx`.

---

## 2. Publicar el Sheet como fuente de datos (Apps Script)

1. Abre el Google Sheet → menú **Extensiones → Apps Script**.
2. Borra el contenido de `Code.gs` que aparece por defecto.
3. Copia y pega el contenido de [`apps-script/Code.gs`](../apps-script/Code.gs) de este repo.
4. Guarda (ícono de disquete o `Cmd+S`).
5. Arriba a la derecha, clic en **Implementar → Nueva implementación**.
6. En "Selecciona el tipo", ícono de engranaje → **Aplicación web**.
7. Configura:
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier usuario
8. Clic en **Implementar**. Google puede pedir autorizar permisos (es tu propio script, es seguro aceptar).
9. Copia la **URL de la aplicación web** que te entrega (termina en `/exec`).

Cada vez que edites el código del script (`Code.gs`) tienes que volver a "Implementar → Gestionar implementaciones → editar → Nueva versión" para que el cambio quede activo. Editar los datos del Sheet (productos, precios, stock) **no** requiere volver a implementar — se reflejan solos, aunque pueden tardar hasta 5 minutos en verse por la caché (ver abajo).

**Caché:** el script guarda el resultado por 5 minutos (`CacheService`) para no releer todo el Sheet en cada visita — importante cuando hay varias personas viendo el catálogo al mismo tiempo o cuando crezca a cientos de productos. Si necesitas ver un cambio de inmediato sin esperar los 5 minutos, vuelve a implementar una nueva versión del script (eso limpia la ejecución en curso) o simplemente espera.

---

## 3. Conectar el sitio al Sheet

Abre [`src/config.js`](../src/config.js) y pega la URL copiada:

```js
export const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycb.../exec'
```

Guarda. Si corres el sitio local (`npm run dev`), recarga la página — el catálogo debería cargar desde el Sheet en vez de los datos de ejemplo. Si algo falla (Sheet mal configurado, columnas con otro nombre, etc.), el sitio cae de vuelta a los datos de ejemplo automáticamente y deja el error en la consola del navegador — no se rompe la página.

También en este archivo va el número de WhatsApp real del negocio:

```js
export const WHATSAPP_NUMBER = '57XXXXXXXXXX' // código de país + número, sin +, sin espacios
```

---

## 4. Correr el sitio en local

Requiere Node.js (ya instalado en esta máquina vía `nvm`).

```bash
npm install
npm run dev
```

Abre la URL que muestra la terminal (por defecto `http://localhost:5173`).

---

## 5. Publicar en GitHub Pages

1. Crear el repositorio en GitHub (uno por cliente — no reusar el de Cartago).
2. Conectar este proyecto local al repo:
   ```bash
   git remote add origin https://github.com/<usuario>/<repo>.git
   git push -u origin main
   ```
3. Generar el build de producción:
   ```bash
   npm run build
   ```
4. Publicar la carpeta `dist/` a GitHub Pages:
   ```bash
   npm run deploy
   ```
   (usa el paquete `gh-pages`, ya configurado en `package.json`, crea/actualiza la rama `gh-pages`).
5. En GitHub → Settings → Pages, configurar que se sirva desde la rama `gh-pages`.

## 6. Conectar el dominio propio del cliente

1. En GitHub → Settings → Pages, agregar el dominio del cliente como "Custom domain".
2. En el proveedor de DNS del cliente, crear los registros que GitHub indique (normalmente un registro `A` apuntando a las IPs de GitHub Pages, o un `CNAME` si es subdominio).
3. Esperar propagación DNS (puede tardar minutos u horas) y activar "Enforce HTTPS" en GitHub Pages una vez esté verificado.

---

## 7. Datos del comprador y rendimiento con ~500 referencias

- **Datos del comprador:** antes de enviar el pedido por WhatsApp, el carrito pide nombre, teléfono y correo (obligatorios) y los incluye en el mensaje. No se guardan en ningún lado — solo viajan dentro del mensaje de WhatsApp.
- **Catálogo con muchas referencias:** la grilla del catálogo muestra 24 productos y agrega un botón "Cargar más" para el resto, en vez de renderizar las 500 de una vez. El filtro por categoría y el buscador funcionan sobre todo el catálogo ya cargado (no hace falta "cargar más" para que el filtro encuentre algo).
- **Fotos:** las tarjetas del catálogo piden la foto en baja resolución (500px de ancho) y la ficha de producto en alta (1000px), reutilizando la misma URL de Cloudinary con una transformación de tamaño distinta. Además usan `loading="lazy"`, así el navegador no descarga fotos que están fuera de pantalla.
- **Varias personas viendo a la vez:** el Apps Script cachea su respuesta 5 minutos (ver sección 2), así que aunque haya varias visitas simultáneas, no todas disparan una lectura completa del Sheet.

---

## Resumen de la secuencia completa

1. Levantar inventario real con Fanny (fuera de este documento).
2. Crear el Google Sheet con la estructura del paso 1.
3. Pegar y publicar el Apps Script (paso 2).
4. Pegar la URL en `config.js` y el número de WhatsApp (paso 3).
5. Probar en local (paso 4).
6. Crear repo en GitHub y publicar (paso 5).
7. Conectar el dominio propio (paso 6).
8. Capacitar al equipo del cliente con `MANUAL_INVENTARIO.docx`.
