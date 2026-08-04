# Contexto del proyecto — JCS Emprende: Catálogos digitales

## Quién soy / marca
Trabajo bajo la marca **JCS Emprende** ("Cree · Emprende · Inspira"). Este es un proyecto de desarrollo digital (no de consultoría) para dos clientes distintos, con el mismo stack técnico repetible.

## Stack técnico estándar
- **Frontend:** React, publicado en GitHub Pages (gratis)
- **Base de datos:** Google Sheets (editable sin conocimientos técnicos por el equipo del cliente)
- **Flujo de venta:** el cliente arma un carrito simple en la web → al confirmar, se genera un resumen que dirige a **WhatsApp** → el negocio le envía un **link de pago** al comprador (tarjeta, débito o transferencia) para cerrar la venta. No hay pasarela de pagos integrada en la web (fuera de alcance por ahora).
- **Dominio:** se vincula al dominio propio existente de cada cliente apuntando a GitHub Pages vía DNS. Si el cliente no tiene dominio, es un costo aparte, facturado por el proveedor externo.
- Precedente: este mismo patrón ya se ha usado antes en otros proyectos del stack (GitHub Pages + React + Google Sheets/Apps Script), incluyendo dashboards de ventas en Sheets con fórmulas SUMIFS.

## Estructura general de cada sitio
1. Página de inicio / institucional: quiénes somos, propuesta de valor, misión y visión
2. Catálogo de productos (grid/lista con filtros)
3. Ficha de producto: foto, descripción, variantes (talla/color/detalles), disponibilidad de inventario
4. Carrito simple → botón que arma el resumen del pedido y lo envía a WhatsApp
5. Panel de datos en Google Sheets como fuente de verdad del inventario, pensado para que lo edite cualquier persona sin conocimientos técnicos

---

## Proyecto 1: Cartago Talabartería SAS

- **Contactos:** David Morales y Marcela
- **Rubro:** talabartería — artículos ecuestres (monturas, riendas, arneses) y marroquinería general (correas, bolsos, billeteras)
- **Tamaño del catálogo:** ~100 ítems
- **Variantes:** colores; algunos ítems tienen detalles personalizables
- **Estado del material:** la mayoría de fotos y descripciones de producto YA EXISTEN. Falta principalmente organizar y cargar esa información al Google Sheets.
- **Carga de datos:** el consultor (yo) hace la carga inicial de datos; después se capacita a David y Marcela para que mantengan el catálogo ellos mismos.
- **Dominio:** el cliente ya tiene un dominio propio existente; hay que reapuntarlo hacia el nuevo sitio en GitHub Pages.
- **Cotización aprobada (JCS Emprende):**
  - Desarrollo: $2.000.000 COP
  - Implementación (carga inicial de datos): $900.000 COP
  - Contenido de empresa (sección institucional): $250.000 COP
  - Soporte y capacitación (2 meses): $600.000 COP
  - **Total: $3.750.000 COP**
- **Fases:** 1) Levantamiento con David y Marcela → 2) Montaje de datos en Sheets → 3) Desarrollo del sitio → 4) Publicación con dominio propio → 5) Capacitación y soporte 2 meses

---

## Proyecto 2: TezCanela

- **Contacto:** Fanny Romero
- **Rubro:** ropa / prendas de vestir
- **Tamaño del catálogo:** ~500 ítems
- **Variantes:** tallas y colores (matriz talla-color-stock)
- **Estado del material:** el sistema de inventario actual no es confiable — **hay que levantar el inventario desde cero**. Las fotos existentes pueden requerir revisión de calidad.
- **Carga de datos:** igual que Cartago — el consultor hace la carga inicial, luego capacita al equipo.
- **Dominio:** el cliente ya tiene dominio propio existente; se reapunta hacia el nuevo sitio.
- **Cotización aprobada (JCS Emprende):**
  - Desarrollo: $3.000.000 COP
  - Implementación (levantamiento + carga de inventario): $1.200.000 COP
  - Contenido de empresa (sección institucional): $300.000 COP
  - Soporte y capacitación (2 meses): $800.000 COP
  - **Total: $5.300.000 COP**
- **Fases:** 1) Levantamiento de inventario real con Fanny → 2) Montaje de datos en Sheets → 3) Desarrollo del sitio con matriz talla-color → 4) Publicación con dominio propio → 5) Capacitación y soporte 2 meses

---

## Fuera de alcance (en ambos proyectos, por ahora)
- Pasarela de pagos integrada en la web (se maneja con link de pago manual por WhatsApp)
- Fotografía profesional de producto nueva
- Rediseño de identidad de marca (logo, papelería)

## Notas de negocio
- Este modelo (catálogo + inventario + WhatsApp) se piensa ofrecer como **producto repetible** a otras pequeñas empresas bajo JCS Emprende, cobrado por proyecto (no por hora), desglosado en Desarrollo / Implementación / Contenido / Soporte para que el monto total no se vea tan alto.
- Cartago se desarrolla primero (más rápido, material ya listo); TezCanela en paralelo mientras se levanta su inventario.
