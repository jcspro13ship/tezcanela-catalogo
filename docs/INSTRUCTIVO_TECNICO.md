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

| id | nombre | categoria | descripcion | precio | imagen | activo | descuento | descuento_hasta |
|----|--------|-----------|-------------|--------|--------|--------|-----------|-----------------|
| p1 | Vestido Amelia | Vestidos | Vestido midi de manga larga... | 189000 | (vacío o URL de foto) | VERDADERO | 0 | 2026-12-31 |

- `id`: identificador único y corto, sin espacios (p1, p2, p3...).
- `precio`: número sin puntos ni signo de pesos (ej. `189000`).
- `imagen`: se puede dejar vacío mientras no haya fotos; el sitio muestra un placeholder con el nombre del producto. Cuando haya foto, pegar ahí la URL pública de la imagen.
- `activo`: `VERDADERO` para que aparezca en el catálogo, `FALSO` para ocultarlo sin borrar la fila.
- `descuento`: porcentaje entero de 0 a 90 (vacío o 0 = sin descuento). La columna se crea sola la primera vez que se aplica un descuento desde el panel; **no hace falta crearla a mano**.
- `descuento_hasta`: último día en que vale el descuento, como `2026-12-31` (vacío = sin fecha de fin). Pasada esa fecha (hora de Colombia, inclusive) el sitio deja de aplicar el descuento solo; el valor queda en el Sheet y el panel lo marca como «descuento vencido». Si se vuelve a importar un CSV de Productos que no la tenga, se pierden los descuentos.

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

## 8. Panel de administración (/admin)

El sitio incluye un panel para **crear productos, editar sus datos y fotos, ajustar stock, precios y descuentos, y ocultar/mostrar productos** sin dar acceso al Google Sheet. Al estar activo, el Sheet puede quedar privado (solo el propietario).

### Qué permite hacer

| Función | Dónde |
|---|---|
| Ajustar stock por talla y color | Fila del producto → **Editar** |
| Cambiar precio | Fila del producto → **Editar** |
| **Editar nombre, categoría y descripción** | Fila del producto → **Editar** |
| **Agregar, quitar y reordenar fotos** (la primera es la portada) | Fila del producto → **Editar** → Fotos → **Guardar fotos** |
| Descuento de un producto (0–90 %) con **fecha de fin** opcional | Fila del producto → **Editar** → Descuento y «Último día del descuento» |
| Descuento (con fecha de fin) a toda una categoría o al catálogo | Botón **Descuentos por categoría** |
| Ocultar o mostrar un producto | Interruptor *Visible/Oculto* de la fila |
| **Crear un producto nuevo** (datos, tallas y colores, fotos) | Botón **+ Nuevo producto** |
| **Compartir** un producto con un cliente | Ícono en **cada tarjeta del catálogo**, botón **Compartir** de la ficha y de la fila del panel |

**Descuentos.** El producto muestra una franja roja con el porcentaje (`-20%`) sobre la foto, el precio nuevo y el precio anterior tachado. El carrito y el mensaje de WhatsApp usan el precio con descuento. El precio final se redondea a la decena (ej. 289.990 − 15 % = 246.490). Con **fecha de fin**, la ficha y el mensaje de compartir dicen «hasta el 30 de diciembre». El **carrito siempre cobra el precio vigente**: si un descuento venció o cambió el precio desde que la clienta agregó el producto, el carrito y el mensaje de WhatsApp se actualizan solos. Los precios se pueden escribir con puntos o con signo de pesos (289.990, $ 289.990): el panel deja solo los números.

**Editar un producto existente.** En **Editar** se cambian nombre, categoría, descripción, precio, descuento y stock con **Guardar cambios**, y las fotos con **Guardar fotos** (botones separados). Las fotos nuevas se reducen y se suben igual que al crear un producto; guardar reemplaza la lista completa de fotos del producto (en el orden mostrado). Si se quitan todas, el producto queda con un recuadro gris.

**Producto nuevo.** Se piden referencia (de ahí sale el código interno `r` + referencia en minúsculas), nombre, categoría, precio, descuento, descripción, tallas y colores con su cantidad, y hasta 10 fotos (la primera es la portada). Las fotos se reducen en el navegador (lado mayor 1600 px) y se suben a Cloudinary con el preset sin firma `tezcanela_catalogo`; el script solo acepta direcciones de fotos de esa cuenta de Cloudinary. El script crea una fila en `Productos`, una por talla/color en `Variantes` (SKU `REF-COL-TALLA`) y una por foto en `Imagenes`. No permite repetir una referencia.

**Compartir.** Está en cada tarjeta del catálogo (ícono), en la ficha y en el panel. En el celular abre el menú de compartir con la **foto** y un mensaje (nombre, precio con descuento y enlace). En el computador ofrece *Enviar por WhatsApp* y *Copiar mensaje*. El enlace es `…/catalogo/?ver=ID`: carga la página `/catalogo` (que GitHub Pages sirve con éxito y con la tarjeta de vista previa) y la app abre la ficha del producto. La vista previa del enlace es la general del catálogo; la foto del producto va aparte, adjunta, en el celular.

### Cómo funciona

- El panel está en la ruta `/admin` (enlace discreto "Administración" en el pie de página). No se indexa en buscadores.
- Escribe en el Sheet a través del Apps Script (`doPost` en `apps-script/Code.gs`). El script corre con la cuenta del propietario, así que funciona aunque el Sheet sea privado.
- **La clave nunca está en el código del sitio ni en el repositorio** (que es público). Se guarda en las *Propiedades del script* (`ADMIN_CLAVE`) y se valida en el servidor.
- Acciones del script: `verificar`, `guardarProducto` (nombre, descripción, categoría, precio, descuento, activo, stock), `guardarFotos` (reemplaza las fotos de un producto), `aplicarDescuento` (categoría o todo) y `crearProducto`.
- Protecciones: bloqueo de 10 minutos tras 5 claves incorrectas; validación estricta de cada dato; cambios de todo o nada; textos que empiezan con `= + - @` se guardan como texto (no como fórmula); un ajuste no puede tocar variantes de otro producto; cada cambio queda en la pestaña `Registro` (se crea sola); la caché del catálogo se borra al guardar.
- Un producto con `activo = FALSO` no aparece en el catálogo ni se abre por enlace directo.

### Cómo activarlo (o actualizarlo)

1. Abrir el Google Sheet → **Extensiones → Apps Script**.
2. Reemplazar **todo** el contenido de `Code.gs` por el de [`apps-script/Code.gs`](../apps-script/Code.gs).
3. (Solo la primera vez) Engranaje **Configuración del proyecto → Propiedades del script → Agregar propiedad**: nombre `ADMIN_CLAVE`, valor = la clave elegida (mínimo 10 caracteres; no escribirla en archivos ni chats).
4. **Implementar → Gestionar implementaciones →** lápiz **→ Nueva versión → Implementar**. Google pedirá autorizar permisos.
5. Entrar a `/admin`, escribir la clave y probar un ajuste pequeño. Verificar que quedó una fila en la pestaña `Registro`.
6. Dejar el Google Sheet **privado** (Compartir → quitar a todas las personas excepto el propietario).

Si el panel dice "El script de Google todavía no tiene esta función", falta el paso 2 o el 4. Cambiar la clave: editar la propiedad `ADMIN_CLAVE` (no requiere nueva implementación).

### Pruebas

- `node apps-script/prueba_code_gs.cjs` prueba `Code.gs` con un simulador de los servicios de Google (33 pruebas: acceso y bloqueo; descuento por producto y por categoría, con fecha de fin; edición de nombre/descripción/categoría; reemplazo de fotos; creación de productos —columnas, SKU únicos, referencia repetida, 28 tipos de datos inválidos sin escribir nada, fórmulas, columnas reordenadas—; precio/activo/stock; todo o nada).
- La interfaz se probó de punta a punta contra el `Code.gs` real con hojas simuladas: entrar, descuento de un producto y de una categoría, franja y precio tachado en el catálogo y la ficha, precio con descuento en el carrito, crear un producto con fotos, editar nombre/categoría/descripción y fotos de un producto existente (agregar, quitar, reordenar), menú de compartir y apertura del enlace compartido.
- Pendiente tras activarlo: una prueba contra el Sheet real y desde un celular.

### Importante: ya no se vuelven a importar los CSV

Con el panel, los productos nuevos se crean desde la app. **Importar un CSV con "Reemplazar hoja actual" borra los ajustes hechos desde el panel** (stock, descuentos). Para cambios masivos en el Sheet, editar las celdas directamente.

---

## Resumen de la secuencia completa

1. Levantar inventario real con Fanny (fuera de este documento).
2. Crear el Google Sheet con la estructura del paso 1.
3. Pegar y publicar el Apps Script (paso 2).
4. Pegar la URL en `config.js` y el número de WhatsApp (paso 3).
5. Probar en local (paso 4).
6. Crear repo en GitHub y publicar (paso 5).
7. Conectar el dominio propio (paso 6).
8. Activar el panel de administración y dejar el Sheet privado (sección 8).
9. Capacitar al equipo del cliente con `MANUAL_INVENTARIO.docx`.
