import { useInstalarApp } from './useInstalarApp';

/** The site's own install offer: the browser prompt, or the iOS hint, once. */
export function InstalarApp() {
  const { oferta, instalar, descartar } = useInstalarApp();
  if (!oferta) return null;

  return (
    <div
      role="region"
      aria-label="Instalar AURA"
      className="border-b border-[#E7E1D7] bg-[#F2ECE1] px-4 py-3 text-sm text-stone-800 sm:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-serif text-base text-stone-900">Instala AURA</p>
          <p className="text-stone-700">
            {oferta === 'GUIA_IOS'
              ? 'En Safari, pulsa Compartir y luego Agregar a pantalla de inicio.'
              : 'Agrégala a tu pantalla de inicio para abrirla como una aplicación.'}
          </p>
        </div>
        <div className="flex gap-2">
          {oferta === 'INSTALAR' && (
            <button
              type="button"
              onClick={() => void instalar()}
              className="min-h-10 rounded-full bg-stone-900 px-4 text-xs font-medium uppercase tracking-widest text-white hover:bg-stone-800"
            >
              Instalar
            </button>
          )}
          <button
            type="button"
            onClick={descartar}
            className="min-h-10 rounded-full border border-[#D5CCC0] bg-white px-4 text-xs font-medium uppercase tracking-widest text-stone-800 hover:bg-[#FAF8F5]"
          >
            {oferta === 'GUIA_IOS' ? 'Entendido' : 'Ahora no'}
          </button>
        </div>
      </div>
    </div>
  );
}
