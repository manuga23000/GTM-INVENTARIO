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
| `components/ui/` | Componentes reutilizables: `Modal`, `NumberInput`, avisos/diálogos (`Feedback`), chips, paginación |
| `lib/format.ts` | Formato de pesos, fechas (zona Argentina) y parseo de números (`1.500,50`) |
| `lib/stock.ts` | Estado de stock (sin / bajo / ok) y tipo de filtro |
| `lib/resumen.ts` | Cálculo de ventas, costos, ganancia y gastos (dashboard, reportes y PDF) |
| `utils/pdfGenerator.ts` | PDF de ventas y PDF de filtros |

## Reglas de negocio

- **Stock**: crear una anotación de Lubricentro descuenta stock; editarla ajusta la diferencia; anularla lo devuelve.
- **Stock bajo**: cada producto puede tener su propio mínimo (por defecto 2).
- **Gastos / Alquiler** no cuentan como ventas: se restan en el "resultado neto".
