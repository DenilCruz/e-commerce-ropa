import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { perfilApi } from '../services/perfil.api';
import { Direccion } from '../types';
import { toast } from 'sonner';
import { Star, Trash2, Camera, UploadCloud } from 'lucide-react';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuthStore();
  
  // Estados de carga
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [cargandoDirecciones, setCargandoDirecciones] = useState(true);
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  // Estados de Perfil (HU-09 y HU-10)
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [celular, setCelular] = useState('');
  const [foto, setFoto] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Estados de Cambio de Contraseña (HU-11)
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  
  // Estados de Direcciones (HU-12, HU-13, HU-14)
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  
  // Formulario Dirección
  const [dirAlias, setDirAlias] = useState('');
  const [dirCalle, setDirCalle] = useState('');
  const [dirNro, setDirNro] = useState('');
  const [dirRef, setDirRef] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // Cargar perfil completo (HU-09)
    const fetchPerfil = async () => {
      try {
        const perfilData = await perfilApi.obtenerPerfil(user.id);
        setNombre(perfilData.nombre || '');
        setApellido(perfilData.apellido || '');
        setCelular(perfilData.celular || '');
        setFoto(perfilData.foto || '');
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos del perfil');
      } finally {
        setCargandoPerfil(false);
      }
    };

    // Cargar direcciones (HU-12)
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

  // Actualizar datos básicos (HU-10)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      setGuardandoPerfil(true);
      const perfilActualizado = await perfilApi.actualizarPerfil(user.id, {
        nombre,
        apellido,
        celular,
        foto,
      });
      setUser({ ...user, ...perfilActualizado });
      toast.success('Perfil actualizado correctamente.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar el perfil.');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // Subir foto de perfil (HU-82)
  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      e.target.value = '';
      return;
    }

    try {
      setSubiendoFoto(true);
      const toastId = toast.loading('Optimizando y subiendo foto de perfil...');
      const res = await perfilApi.subirFotoPerfil(file);
      setFoto(res.url);

      // Guardar automáticamente en el perfil del usuario
      await perfilApi.actualizarPerfil(user.id, { foto: res.url });
      setUser({ ...user, foto: res.url });
      toast.success('Foto de perfil optimizada y actualizada con éxito.', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al procesar y subir la foto de perfil.');
    } finally {
      setSubiendoFoto(false);
      e.target.value = '';
    }
  };

  // Eliminar foto de perfil (HU-82)
  const handleEliminarFoto = async () => {
    if (!user || !foto) return;
    if (!confirm('¿Deseas quitar tu foto de perfil?')) return;

    try {
      setSubiendoFoto(true);
      const toastId = toast.loading('Eliminando foto de perfil...');
      await perfilApi.actualizarPerfil(user.id, { foto: '' });
      setFoto('');
      setUser({ ...user, foto: '' });
      toast.success('Foto de perfil eliminada.', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al eliminar la foto de perfil.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Cambiar contraseña (HU-11)
  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (nuevaContrasena.length < 6) {
      return toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
    }

    if (nuevaContrasena !== confirmarContrasena) {
      return toast.error('La confirmación de la contraseña no coincide.');
    }

    try {
      setGuardandoPassword(true);
      const toastId = toast.loading('Actualizando contraseña...');
      await perfilApi.cambiarContrasena(user.id, {
        contrasenaActual,
        nuevaContrasena,
      });
      toast.success('Contraseña cambiada exitosamente.', { id: toastId });
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cambiar contraseña.');
    } finally {
      setGuardandoPassword(false);
    }
  };

  // Agregar Dirección (HU-12)
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
      setDirecciones([nuevaDir, ...direcciones]);
      setDirAlias('');
      setDirCalle('');
      setDirNro('');
      setDirRef('');
      setMostrarFormDireccion(false);
      toast.success('Dirección agregada a tu libreta.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al agregar dirección.');
    } finally {
      setGuardandoDireccion(false);
    }
  };

  // Marcar como predeterminada (HU-13)
  const handleMarcarPredeterminada = async (dirId: string) => {
    if (!user) return;
    try {
      const dirsActualizadas = await perfilApi.marcarPredeterminada(user.id, dirId);
      setDirecciones(dirsActualizadas);
      toast.success('Dirección establecida como predeterminada.');
    } catch (err: any) {
      toast.error('No se pudo establecer como predeterminada.');
    }
  };

  // Eliminar Dirección (HU-14)
  const handleDeleteDireccion = async (id: string) => {
    if (!user || !window.confirm('¿Seguro que deseas eliminar esta dirección?')) return;
    
    const dirPrevias = [...direcciones];
    setDirecciones(direcciones.filter(d => d.id !== id));
    
    try {
      await perfilApi.eliminarDireccion(user.id, id);
      toast.success('Dirección eliminada.');
    } catch (err) {
      toast.error('Error al eliminar dirección.');
      setDirecciones(dirPrevias);
    }
  };

  if (!user || cargandoPerfil) {
    return <div className="py-20 text-center text-xs tracking-widest uppercase text-gray-400">Cargando perfil...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* Cabecera */}
      <div className="mb-12 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-light tracking-tight mb-2">Mi Perfil</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          Gestiona tus datos personales, contraseña y libreta de direcciones
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* COLUMNA IZQUIERDA: DATOS PERSONALES Y SEGURIDAD */}
        <div className="space-y-10">
          
          {/* BLOQUE 1: DATOS PERSONALES (HU-09 y HU-10) */}
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest mb-6">Datos Personales (HU-09, HU-10)</h2>
            <div className="bg-[#f9f9f9] p-8 border border-gray-100 rounded-xl">
              
              {/* Avatar e Información rápida */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 pb-8 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 bg-black rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-light border-2 border-white shadow-sm">
                      {foto ? (
                        <img src={getImageUrl(foto)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{nombre.charAt(0).toUpperCase() || user.correo.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-center px-1">
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>{subiendoFoto ? '...' : 'Subir'}</span>
                      <input type="file" accept="image/*" onChange={handleSubirFoto} className="hidden" disabled={subiendoFoto} />
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer shadow-sm text-gray-700">
                      <UploadCloud className="w-3.5 h-3.5 text-gray-500" />
                      <span>{subiendoFoto ? 'Procesando...' : foto ? 'Cambiar foto' : 'Subir foto'}</span>
                      <input type="file" accept="image/*" onChange={handleSubirFoto} className="hidden" disabled={subiendoFoto} />
                    </label>
                    {foto && (
                      <button
                        type="button"
                        onClick={handleEliminarFoto}
                        disabled={subiendoFoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Quitar foto</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="sm:border-l sm:border-gray-200 sm:pl-6">
                  <p className="text-lg font-medium text-gray-900">{nombre} {apellido}</p>
                  <p className="text-xs text-gray-500">{user.correo}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold rounded bg-emerald-100 text-emerald-800">
                    Rol: {user.rol || 'Cliente'}
                  </span>
                </div>
              </div>

              {/* Formulario Editar Perfil */}
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Nombre</label>
                    <input 
                      type="text" 
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Apellido</label>
                    <input 
                      type="text" 
                      value={apellido}
                      onChange={e => setApellido(e.target.value)}
                      className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-2">Celular / Teléfono</label>
                  <input 
                    type="tel" 
                    value={celular}
                    onChange={e => setCelular(e.target.value)}
                    placeholder="+591 70000000"
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={guardandoPerfil}
                  className="bg-black text-white px-8 py-3 text-xs tracking-widest uppercase font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {guardandoPerfil ? 'Guardando...' : 'Guardar Datos'}
                </button>
              </form>
            </div>
          </div>

          {/* BLOQUE 2: CAMBIAR CONTRASEÑA (HU-11) */}
          <div>
            <h2 className="text-sm font-medium uppercase tracking-widest mb-6">Seguridad y Contraseña (HU-11)</h2>
            <div className="bg-[#f9f9f9] p-8 border border-gray-100 rounded-xl">
              <form onSubmit={handleCambiarPassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Contraseña Actual</label>
                  <input
                    type="password"
                    required
                    value={contrasenaActual}
                    onChange={e => setContrasenaActual(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Nueva Contraseña (mínimo 6 caracteres)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={nuevaContrasena}
                    onChange={e => setNuevaContrasena(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmarContrasena}
                    onChange={e => setConfirmarContrasena(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-black bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={guardandoPassword}
                  className="bg-black text-white px-8 py-3 text-xs tracking-widest uppercase font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {guardandoPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: DIRECCIONES (HU-12, HU-13, HU-14) */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-medium uppercase tracking-widest">Direcciones de Envío (HU-12, 13, 14)</h2>
            <button 
              onClick={() => setMostrarFormDireccion(!mostrarFormDireccion)}
              className="text-xs uppercase tracking-widest font-semibold text-black hover:underline"
            >
              {mostrarFormDireccion ? 'Cancelar' : '+ Nueva Dirección'}
            </button>
          </div>

          {/* Formulario Agregar Dirección */}
          {mostrarFormDireccion && (
            <div className="bg-[#f9f9f9] p-8 border border-gray-200 rounded-xl mb-8">
              <h3 className="text-xs uppercase tracking-widest font-semibold mb-4 text-gray-800">Nueva Dirección de Entrega</h3>
              <form onSubmit={handleAddDireccion} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Alias (Ej: Casa, Oficina)</label>
                  <input 
                    type="text" 
                    value={dirAlias}
                    onChange={e => setDirAlias(e.target.value)}
                    placeholder="Casa"
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg bg-white outline-none focus:border-black"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Calle / Avenida</label>
                    <input 
                      type="text" 
                      value={dirCalle}
                      onChange={e => setDirCalle(e.target.value)}
                      required
                      placeholder="Av. Las Américas"
                      className="w-full text-sm p-3 border border-gray-200 rounded-lg bg-white outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Número</label>
                    <input 
                      type="text" 
                      value={dirNro}
                      onChange={e => setDirNro(e.target.value)}
                      required
                      placeholder="123"
                      className="w-full text-sm p-3 border border-gray-200 rounded-lg bg-white outline-none focus:border-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Referencia</label>
                  <input 
                    type="text" 
                    value={dirRef}
                    onChange={e => setDirRef(e.target.value)}
                    placeholder="Frente a la plaza principal"
                    className="w-full text-sm p-3 border border-gray-200 rounded-lg bg-white outline-none focus:border-black"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={guardandoDireccion}
                  className="w-full bg-black text-white py-3 text-xs tracking-widest uppercase font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {guardandoDireccion ? 'Guardando...' : 'Guardar Dirección'}
                </button>
              </form>
            </div>
          )}

          {/* Listado de Direcciones */}
          {cargandoDirecciones ? (
            <p className="text-xs text-gray-400 uppercase tracking-widest">Cargando direcciones...</p>
          ) : direcciones.length === 0 ? (
            <div className="p-8 border border-dashed border-gray-200 rounded-xl text-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">No tienes direcciones registradas</p>
              <p className="text-sm text-gray-500">Agrega una para agilizar tus compras.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {direcciones.map(dir => (
                <div key={dir.id} className="p-6 border border-gray-200 rounded-xl bg-white relative flex flex-col justify-between hover:border-gray-400 transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-widest font-bold text-black">{dir.alias || 'Dirección'}</span>
                      {dir.predeterminada ? (
                        <span className="text-[10px] uppercase tracking-widest bg-black text-white px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 shadow-xs">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Predeterminada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarcarPredeterminada(dir.id)}
                          className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-black hover:underline"
                        >
                          Marcar como predeterminada
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{dir.calle} #{dir.nrocasa}</p>
                    {dir.referencia && <p className="text-xs text-gray-400 mt-1 italic">{dir.referencia}</p>}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                    <button 
                      onClick={() => handleDeleteDireccion(dir.id)}
                      className="inline-flex items-center text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Eliminar Dirección
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
