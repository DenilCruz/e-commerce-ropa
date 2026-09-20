import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { perfilApi } from '../services/perfil.api';
import { Direccion } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  
  // Estados de carga
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [cargandoDirecciones, setCargandoDirecciones] = useState(true);
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  // Estados de Perfil
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [celular, setCelular] = useState('');
  
  // Estados de Direcciones
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  
  // Formulario Direccion
  const [dirAlias, setDirAlias] = useState('');
  const [dirCalle, setDirCalle] = useState('');
  const [dirNro, setDirNro] = useState('');
  const [dirRef, setDirRef] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Cargar perfil completo
    const fetchPerfil = async () => {
      try {
        const perfilData = await perfilApi.obtenerPerfil(user.id);
        setNombre(perfilData.nombre || '');
        setApellido(perfilData.apellido || '');
        setCelular(perfilData.celular || '');
      } catch (err) {
        console.error(err);
      } finally {
        setCargandoPerfil(false);
      }
    };

    // Cargar direcciones
    const fetchDirecciones = async () => {
      try {
        const dirData = await perfilApi.obtenerDirecciones(user.id);
        setDirecciones(dirData);
      } catch (err) {
        console.error(err);
      } finally {
        setCargandoDirecciones(false);
      }
    };

    fetchPerfil();
    fetchDirecciones();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setGuardandoPerfil(true);
      const perfilActualizado = await perfilApi.actualizarPerfil(user.id, {
        nombre,
        apellido,
        celular
      });
      // Actualizamos el Zustand store para que el Navbar cambie de inmediato
      setUser({ ...user, ...perfilActualizado });
      alert('Perfil actualizado correctamente.');
    } catch (err) {
      alert('Error al actualizar el perfil.');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleAddDireccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setGuardandoDireccion(true);
      const nuevaDir = await perfilApi.agregarDireccion(user.id, {
        alias: dirAlias,
        calle: dirCalle,
        nrocasa: dirNro,
        referencia: dirRef
      });
      setDirecciones([nuevaDir, ...direcciones]); // prepend to show immediately
      
      // Limpiar y cerrar formulario
      setDirAlias('');
      setDirCalle('');
      setDirNro('');
      setDirRef('');
      setMostrarFormDireccion(false);
    } catch (err) {
      alert('Error al agregar dirección.');
    } finally {
      setGuardandoDireccion(false);
    }
  };

  const handleDeleteDireccion = async (id: string) => {
    if (!user || !window.confirm('¿Seguro que deseas eliminar esta dirección?')) return;
    
    // Optimistic UI
    const dirPrevias = [...direcciones];
    setDirecciones(direcciones.filter(d => d.id !== id));
    
    try {
      await perfilApi.eliminarDireccion(user.id, id);
    } catch (err) {
      alert('Error al eliminar. Revertiendo.');
      setDirecciones(dirPrevias);
    }
  };

  if (!user || cargandoPerfil) {
    return <div className="py-20 text-center text-xs tracking-widest uppercase text-gray-400">Cargando perfil...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="mb-12 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-light tracking-tight mb-2">Mi Perfil</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          Gestiona tus datos personales y lugares de entrega
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* COLUMNA IZQUIERDA: DATOS PERSONALES */}
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest mb-6">Datos Personales</h2>
          <div className="bg-[#f9f9f9] p-8 border border-gray-100 mb-8">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-2xl font-light">
                {nombre.charAt(0).toUpperCase() || user.correo.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-medium">{user.correo}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Cuenta Activa</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Nombre</label>
                  <input 
                    type="text" 
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    className="w-full text-sm p-3 border border-gray-200 focus:outline-none focus:border-black bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Apellido</label>
                  <input 
                    type="text" 
                    value={apellido}
                    onChange={e => setApellido(e.target.value)}
                    className="w-full text-sm p-3 border border-gray-200 focus:outline-none focus:border-black bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Celular</label>
                <input 
                  type="tel" 
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  placeholder="+591 70000000"
                  className="w-full text-sm p-3 border border-gray-200 focus:outline-none focus:border-black bg-white"
                />
              </div>

              <button 
                type="submit" 
                disabled={guardandoPerfil}
                className="mt-6 bg-black text-white px-8 py-3 text-xs tracking-widest uppercase font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: DIRECCIONES */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-medium uppercase tracking-widest">Libreta de Direcciones</h2>
            {!mostrarFormDireccion && (
              <button 
                onClick={() => setMostrarFormDireccion(true)}
                className="text-[10px] uppercase tracking-widest border-b border-black pb-0.5 hover:text-gray-500 hover:border-gray-500 transition-colors"
              >
                + Nueva Dirección
              </button>
            )}
          </div>

          {mostrarFormDireccion && (
            <div className="bg-[#f9f9f9] p-6 border border-gray-100 mb-8 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-medium uppercase tracking-widest">Agregar Dirección</h3>
                <button onClick={() => setMostrarFormDireccion(false)} className="text-gray-400 hover:text-black">✕</button>
              </div>
              <form onSubmit={handleAddDireccion} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Alias (Ej: Casa, Oficina)</label>
                  <input 
                    type="text" 
                    value={dirAlias}
                    onChange={e => setDirAlias(e.target.value)}
                    className="w-full text-sm p-2.5 border border-gray-200 focus:outline-none focus:border-black bg-white"
                    placeholder="Casa"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Calle / Avenida *</label>
                    <input 
                      type="text" 
                      value={dirCalle}
                      onChange={e => setDirCalle(e.target.value)}
                      className="w-full text-sm p-2.5 border border-gray-200 focus:outline-none focus:border-black bg-white"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Nro *</label>
                    <input 
                      type="text" 
                      value={dirNro}
                      onChange={e => setDirNro(e.target.value)}
                      className="w-full text-sm p-2.5 border border-gray-200 focus:outline-none focus:border-black bg-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Referencia</label>
                  <input 
                    type="text" 
                    value={dirRef}
                    onChange={e => setDirRef(e.target.value)}
                    className="w-full text-sm p-2.5 border border-gray-200 focus:outline-none focus:border-black bg-white"
                    placeholder="Al lado de la farmacia..."
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={guardandoDireccion}
                  className="w-full bg-black text-white py-3 mt-2 text-[10px] tracking-widest uppercase font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {guardandoDireccion ? 'Guardando...' : 'Guardar Dirección'}
                </button>
              </form>
            </div>
          )}

          {cargandoDirecciones ? (
            <p className="text-xs text-gray-400 uppercase tracking-widest">Cargando direcciones...</p>
          ) : direcciones.length === 0 ? (
            <div className="border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm">
              No tienes direcciones guardadas.
            </div>
          ) : (
            <div className="space-y-4">
              {direcciones.map(dir => (
                <div key={dir.id} className="border border-gray-200 p-5 hover:border-black transition-colors group relative">
                  {dir.predeterminada && (
                    <span className="absolute top-5 right-5 text-[9px] bg-black text-white px-2 py-0.5 uppercase tracking-widest">Principal</span>
                  )}
                  <h4 className="font-medium text-sm mb-1">{dir.alias || 'Dirección'}</h4>
                  <p className="text-sm text-gray-600 mb-1">{dir.calle} #{dir.nrocasa}</p>
                  {dir.referencia && <p className="text-xs text-gray-500 italic mb-4">{dir.referencia}</p>}
                  
                  <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDeleteDireccion(dir.id)}
                      className="text-[10px] text-red-600 uppercase tracking-widest hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
