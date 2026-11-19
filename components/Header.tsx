"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Home, Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/lubricentro", label: "Lubricentro", icon: Package },
  { href: "/inventario-taller", label: "Taller", icon: Wrench },
  { href: "/anotaciones", label: "Anotaciones", icon: FileText },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
];

export default function Header() {
  const pathname = usePathname();
  const activo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Barra superior */}
      <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-black/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-lg bg-brand-600 p-1.5">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-white">GTM Inventario</p>
              <p className="hidden text-[11px] text-neutral-400 sm:block">Grandoli Taller Mecánico</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.slice(1).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activo(href)
                    ? "bg-brand-600/15 text-brand-400"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label === "Taller" ? "Inventario Taller" : label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Navegación inferior en mobile (más cómoda con el pulgar) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                activo(href) ? "text-brand-500" : "text-neutral-400 active:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
