# GTM Inventario

Sistema de gestión para **Grandoli Taller Mecánico**: lubricentro, inventario de taller, anotaciones (ventas y gastos) y reportes en PDF.

Next.js 16 · React 19 · Firebase Firestore (base `gtm2`) · Tailwind CSS 4 · jsPDF.

## Desarrollo

```bash
npm install
npm run dev
```

Variables necesarias en `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
# Opcional: probar contra el emulador local sin tocar datos reales
# NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `app/` | Páginas (inicio, lubricentro, inventario-taller, anotaciones, reportes) |
| `actions/` | Lectura/escritura en Firestore. El stock se modifica siempre dentro de transacciones |
| `actions/ingresos.ts` | Ingreso de mercadería: suma stock, actualiza costos y guarda el comprobante en `ingresos_mercaderia` |
| `components/ui/` | Componentes reutilizables: `Modal`, `NumberInput`, avisos/diálogos (`Feedback`), chips, paginación |
| `lib/format.ts` | Formato de pesos, fechas (zona Argentina) y parseo de números (`1.500,50`) |
| `lib/stock.ts` | Estado de stock (sin / bajo / ok) y tipo de filtro |
| `lib/resumen.ts` | Cálculo de ventas, costos, ganancia y gastos (dashboard, reportes y PDF) |
| `utils/pdfGenerator.ts` | PDF de ventas y PDF de filtros (con el logo de `public/logo-gtm-pdf.png`) |

## App instalable (PWA)

- `app/manifest.ts`: nombre, colores, íconos y accesos directos (Nueva anotación, Lubricentro, Reportes).
- `public/sw.js`: service worker mínimo. **No guarda datos en caché** (stock y precios siempre de internet); solo muestra `public/offline.html` sin conexión. Si se modifica, subir `VERSION`.
- `components/InstalarApp.tsx`: botón "Instalar" (Android/Chrome) o instrucciones (iPhone) en el Inicio.
- Instalar: Android → menú ⋮ → *Instalar app*; iPhone (Safari) → Compartir → *Agregar a inicio*.

## Reglas de negocio

- **Stock**: crear una anotación de Lubricentro descuenta stock; editarla ajusta la diferencia; anularla lo devuelve.
- **Stock bajo**: cada producto puede tener su propio mínimo (por defecto 2).
- **Gastos / Alquiler** no cuentan como ventas: se restan en el "resultado neto".
- **Aumento masivo de precios** (Lubricentro → Precios): se aplica a los productos filtrados; puede tocar costo, venta o ambos y redondear la venta hacia arriba.
- **Ingreso de mercadería** (Lubricentro → Ingreso): suma stock y, si se elige, actualiza el costo y recalcula la venta manteniendo el recargo.
- **Ganancia en reportes**: si un item vendido no tiene costo cargado pero está vinculado a un producto, se estima con el costo actual del producto. La mano de obra cuenta como ganancia completa.

## Publicación

- Se publica automáticamente en **Vercel** con cada push a `main`.
- Si una publicación no aparece, en Vercel: *Deployments* → ⋯ → **Redeploy**, y verificar en *Settings → Git* que el repositorio siga conectado.
- Las variables `NEXT_PUBLIC_FIREBASE_*` se cargan en Vercel (*Settings → Environment Variables*), nunca en el repositorio.
