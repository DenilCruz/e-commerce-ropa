import React, { useEffect, useState } from 'react';
import { resenasApi } from '../services/resenas.api';
import { Resena, ResumenResenas } from '../types';
import { useAuthStore } from '../../../store/auth.store';

interface ResenasSectionProps {
  productoId: string;
}

export const ResenasSection: React.FC<ResenasSectionProps> = ({ productoId }) => {
  const { user } = useAuthStore();
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [resumen, setResumen] = useState<ResumenResenas>({ promedio: 0, total: 0 });
  const [cargando, setCargando] = useState(true);

  // Formulario
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargarDatos = async () => {
    try {
      const [dataResenas, dataResumen] = await Promise.all([
        resenasApi.obtenerPorProducto(productoId),
        resenasApi.obtenerResumen(productoId)
      ]);
      setResenas(dataResenas);
      setResumen(dataResumen);
    } catch (error) {
      console.error('Error cargando reseñas', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [productoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setEnviando(true);
    setErrorForm('');
    try {
      await resenasApi.crear({
        productoId,
        usuarioId: user.id,
        calificacion,
        comentario
      });
      setComentario('');
      setCalificacion(5);
      await cargarDatos();
    } catch (err: any) {
      setErrorForm(err.response?.data?.message || 'Error al enviar reseña. ¿Ya opinaste antes?');
    } finally {
      setEnviando(false);
    }
  };

  const renderStars = (rating: number, isInteractive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={isInteractive ? 'button' : 'button'}
            disabled={!isInteractive}
            onClick={() => isInteractive && setCalificacion(star)}
            className={`w-4 h-4 focus:outline-none transition-colors ${star <= rating ? 'text-black' : 'text-gray-200'} ${isInteractive ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
            </svg>
          </button>
        ))}
      </div>
    );
  };

  if (cargando) return <div className="py-12 flex justify-center text-xs text-gray-400 uppercase tracking-widest">Cargando opiniones...</div>;

  const yaOpino = user && resenas.some(r => r.usuarioId === user.id);

  return (
    <div className="border-t border-gray-200 mt-20 pt-16 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        
        {/* Lado Izquierdo: Resumen y Formulario */}
        <div className="md:col-span-1">
          <h2 className="text-sm tracking-widest uppercase font-medium mb-6">Valoraciones</h2>
          
          <div className="flex items-end gap-3 mb-4">
            <span className="text-4xl font-light leading-none">{resumen.promedio.toFixed(1)}</span>
            <div className="pb-1">
              {renderStars(Math.round(resumen.promedio))}
            </div>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-10">{resumen.total} Opiniones</p>

          {/* Formulario */}
          {!user ? (
            <div className="bg-[#f9f9f9] p-6 text-center">
              <p className="text-xs text-gray-500 mb-3">Inicia sesión para opinar</p>
              <Link to="/login" className="text-xs tracking-widest uppercase border-b border-black pb-1 hover:text-gray-600 transition-colors">Iniciar Sesión</Link>
            </div>
          ) : yaOpino ? (
            <div className="bg-[#f9f9f9] p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Ya valoraste este producto</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-xs uppercase tracking-widest font-medium mb-2">Escribe una reseña</h3>
              {errorForm && <p className="text-xs text-red-500">{errorForm}</p>}
              <div className="mb-2">
                {renderStars(calificacion, true)}
              </div>
              <textarea 
                required
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                placeholder="Cuéntanos tu experiencia con esta prenda..."
                className="w-full text-sm p-4 border border-gray-200 focus:outline-none focus:border-black resize-none h-24 transition-colors"
              />
              <button 
                type="submit" 
                disabled={enviando}
                className="w-full bg-black text-white py-3 text-xs tracking-widest uppercase font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {enviando ? 'Enviando...' : 'Publicar Reseña'}
              </button>
            </form>
          )}
        </div>

        {/* Lado Derecho: Lista de Reseñas */}
        <div className="md:col-span-2 space-y-8">
          {resenas.length === 0 ? (
            <p className="text-sm text-gray-500 font-light pt-8">No hay opiniones aún. Sé el primero en compartir la tuya.</p>
          ) : (
            resenas.map(resena => (
              <div key={resena.id} className="border-b border-gray-100 pb-8 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium mb-1">{resena.usuario?.nombre || 'Cliente Anónimo'}</p>
                    {renderStars(resena.calificacion)}
                  </div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                    {new Date(resena.creadoEn).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-light mt-3 leading-relaxed">
                  "{resena.comentario}"
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
