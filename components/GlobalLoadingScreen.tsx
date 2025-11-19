export default function GlobalLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="animate-pulse">
        <div className="w-16 h-16 bg-red-600 rounded-full mx-auto mb-4"></div>
        <p className="text-white text-center">Cargando...</p>
      </div>
    </div>
  );
}
