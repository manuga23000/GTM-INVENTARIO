import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  FileText,
  Package,
  PackageX,
  Receipt,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { getDashboardData } from "@/actions/dashboard";
import InstalarApp from "@/components/InstalarApp";
import { StatCard } from "@/components/ui";
import { ETIQUETAS_TIPO, esGasto } from "@/types/anotaciones";
import { formatCurrency, formatFecha, formatFechaCorta, formatNumber, hoyISO } from "@/lib/format";
import { estadoStock } from "@/lib/stock";

// Siempre datos frescos: sin esto Next generaba la página una sola vez en el build.
export const dynamic = "force-dynamic";

const NOMBRE_MES = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });

export default async function Home() {
  const d = await getDashboardData();

  const accesos = [
    { href: "/anotaciones", label: "Anotaciones", desc: "Registrar ventas y gastos", icon: FileText },
    { href: "/lubricentro", label: "Lubricentro", desc: "Productos, stock y precios", icon: Package },
    { href: "/inventario-taller", label: "Inventario Taller", desc: "Herramientas y equipos", icon: Wrench },
    { href: "/reportes", label: "Reportes", desc: "Resúmenes y PDF", icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <InstalarApp />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Hola 👋 <span className="text-neutral-500">· GTM</span>
        </h1>
        <p className="text-sm text-neutral-400">Resumen del negocio al {formatFecha(hoyISO())}</p>
      </div>

      {!d.ok && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" /> No se pudieron cargar los datos. Revisá la conexión e intentá de nuevo.
        </div>
      )}

      {/* Ventas */}
      <h2 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
        Ventas de {NOMBRE_MES(d.mes.inicio)}
      </h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Receipt}
          label="Ventas del mes"
          value={formatCurrency(d.mes.ventas)}
          hint={`${d.mes.operaciones} operaciones`}
        />
        <StatCard icon={TrendingUp} tone="success" label="Ganancia del mes" value={formatCurrency(d.mes.ganancia)} />
        <StatCard icon={Wallet} tone="warning" label="Gastos del mes" value={formatCurrency(d.mes.gastos)} />
        <StatCard
          icon={Receipt}
          label="Esta semana"
          value={formatCurrency(d.semana.ventas)}
          hint={`Ganancia ${formatCurrency(d.semana.ganancia)}`}
        />
      </div>

      {/* Inventario */}
      <h2 className="mb-3 text-xs font-semibold tracking-wider text-neutral-500 uppercase">Inventario</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Productos lubricentro"
          value={formatNumber(d.lubricentroProductos)}
          hint={`${formatNumber(d.tallerItems)} items de taller`}
        />
        <StatCard
          icon={PackageX}
          tone={d.sinStock + d.stockBajo > 0 ? "danger" : "default"}
          label="Sin stock / bajo"
          value={`${d.sinStock} / ${d.stockBajo}`}
        />
        <StatCard icon={Wallet} label="Valor a costo" value={formatCurrency(d.valorCosto)} />
        <StatCard
          icon={TrendingUp}
          tone="success"
          label="Valor a venta"
          value={formatCurrency(d.valorVenta)}
          hint={`Ganancia potencial ${formatCurrency(d.valorVenta - d.valorCosto)}`}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Reponer */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Para reponer
            </h2>
            <Link href="/lubricentro" className="text-xs text-brand-400 hover:underline">
              Ver todo
            </Link>
          </div>
          {d.productosCriticos.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">Todo el stock está en orden 👌</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {d.productosCriticos.map((p) => {
                const sin = estadoStock(p) === "sin";
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{p.descripcion}</p>
                      <p className="text-xs text-neutral-500">
                        {[p.codigo, p.marca].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span
                      className={
                        sin
                          ? "shrink-0 rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400"
                          : "shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300"
                      }
                    >
                      {sin ? "Sin stock" : `Quedan ${formatNumber(p.stock)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Últimas anotaciones */}
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <FileText className="h-4 w-4 text-brand-500" /> Últimos movimientos
            </h2>
            <Link href="/anotaciones" className="text-xs text-brand-400 hover:underline">
              Ver todo
            </Link>
          </div>
          {d.ultimas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-500">Todavía no hay anotaciones</p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {d.ultimas.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{a.titulo}</p>
                    <p className="text-xs text-neutral-500 capitalize">
                      {formatFechaCorta(a.fecha)} · {ETIQUETAS_TIPO[a.tipo] || a.tipo}
                    </p>
                  </div>
                  <span
                    className={
                      esGasto(a.tipo)
                        ? "shrink-0 text-sm font-semibold text-amber-300 tabular"
                        : "shrink-0 text-sm font-semibold text-white tabular"
                    }
                  >
                    {esGasto(a.tipo) ? "−" : ""}
                    {formatCurrency(a.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Accesos (en escritorio; en mobile está la barra inferior) */}
      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-4">
        {accesos.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="card group flex items-center gap-4 p-4 transition-colors hover:border-brand-600/60"
          >
            <div className="rounded-lg bg-brand-600 p-3">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">{label}</p>
              <p className="text-sm text-neutral-400">{desc}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-neutral-600 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
