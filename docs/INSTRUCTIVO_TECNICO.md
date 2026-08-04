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

Crea un Google Sheet nuevo con **dos pestañas**, con estos nombres y columnas exactos (mayúsculas/minúsculas importan):

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

Cada vez que edites el código del script (`Code.gs`) tienes que volver a "Implementar → Gestionar implementaciones → editar → Nueva versión" para que el cambio quede activo. Editar los datos del Sheet (productos, precios, stock) **no** requiere volver a implementar — se reflejan solos.

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

## Resumen de la secuencia completa

1. Levantar inventario real con Fanny (fuera de este documento).
2. Crear el Google Sheet con la estructura del paso 1.
3. Pegar y publicar el Apps Script (paso 2).
4. Pegar la URL en `config.js` y el número de WhatsApp (paso 3).
5. Probar en local (paso 4).
6. Crear repo en GitHub y publicar (paso 5).
7. Conectar el dominio propio (paso 6).
8. Capacitar al equipo del cliente con `MANUAL_INVENTARIO.docx`.
