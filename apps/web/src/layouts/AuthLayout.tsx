import React from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  const location = useLocation();
  const { slug } = useParams<{ slug?: string }>();
  const matchTenant = location.pathname.match(/^\/t\/([^/]+)/);
  const targetSlug = slug || (matchTenant ? matchTenant[1] : null);

  const backUrl = targetSlug ? `/t/${targetSlug}` : '/';
  const backLabel = targetSlug ? `Volver a ${targetSlug}` : 'Regresar al Menú Principal';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF8F5] text-stone-900 font-sans p-4 sm:p-6 selection:bg-[#E7E1D7]">
      {/* Barra superior de retorno */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
        <Link to={backUrl} className="flex items-center gap-2 group">
          <span className="font-serif text-xl tracking-[0.25em] font-normal uppercase text-stone-900 group-hover:text-[#9B7B54] transition-colors">
            {targetSlug ? targetSlug.toUpperCase() : 'AURA'}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#EAE2D5] text-[#9B7B54] border border-[#D5CCC0]">
            {targetSlug ? 'Atelier' : 'SaaS'}
          </span>
        </Link>

        <Link
          to={backUrl}
          className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors py-1.5 px-3.5 rounded-full border border-[#E7E1D7] bg-white hover:bg-[#F2ECE1] shadow-xs group font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-[#9B7B54]" />
          <span>{backLabel}</span>
        </Link>
      </header>

      {/* Tarjeta de Contenido Auth */}
      <main className="w-full max-w-md mx-auto my-auto bg-white rounded-xl shadow-md border border-[#E7E1D7] p-8">
        <Outlet />
      </main>

      {/* Footer minimalista */}
      <footer className="text-center py-3 text-xs text-stone-400">
        © {new Date().getFullYear()} AURA Omnichannel Technologies · Comercio de Moda y Alta Costura
      </footer>
    </div>
  );
};
