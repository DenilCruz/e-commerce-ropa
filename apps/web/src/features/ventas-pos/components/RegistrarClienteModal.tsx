import React, { useRef, useState } from 'react';
import { ClienteLocal } from '../types';
import { NuevoClienteLocal } from '../services/clientesLocales';
import { ModalPos, botonPrimario, botonSecundario, campo, etiqueta } from './ModalPos';

interface Props {
  isOnline: boolean;
  onGuardar: (datos: Omit<NuevoClienteLocal, 'tenantId' | 'usuarioId'>) => Promise<ClienteLocal>;
  onCerrar: () => void;
}

export const RegistrarClienteModal: React.FC<Props> = ({ isOnline, onGuardar, onCerrar }) => {
  const [form, setForm] = useState({ nombre: '', apellido: '', celular: '', ci: '', correo: '' });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const enCurso = useRef(false);

  const cambiar = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enCurso.current) return;
    enCurso.current = true;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(form);
      onCerrar();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar el cliente en este equipo.');
    } finally {
      enCurso.current = false;
      setGuardando(false);
    }
  };

  return (
    <ModalPos
      titulo="Registrar cliente"
      descripcion={isOnline ? 'Se guarda en este equipo y se envía de inmediato.' : 'Sin conexión: queda guardado y se enviará cuando vuelva internet.'}
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} className="space-y-3" noValidate>
        <div>
          <label htmlFor="cli-nombre" className={etiqueta}>Nombre *</label>
          <input id="cli-nombre" data-autofocus required maxLength={80} value={form.nombre} onChange={cambiar('nombre')} className={campo} aria-required="true" />
        </div>
        <div>
          <label htmlFor="cli-apellido" className={etiqueta}>Apellido</label>
          <input id="cli-apellido" maxLength={80} value={form.apellido} onChange={cambiar('apellido')} className={campo} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cli-celular" className={etiqueta}>Celular</label>
            <input id="cli-celular" type="tel" inputMode="tel" maxLength={20} value={form.celular} onChange={cambiar('celular')} className={campo} />
          </div>
          <div>
            <label htmlFor="cli-ci" className={etiqueta}>CI</label>
            <input id="cli-ci" maxLength={20} value={form.ci} onChange={cambiar('ci')} className={campo} />
          </div>
        </div>
        <div>
          <label htmlFor="cli-correo" className={etiqueta}>Correo</label>
          <input id="cli-correo" type="email" value={form.correo} onChange={cambiar('correo')} className={campo} />
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className={botonSecundario}>Cancelar</button>
          <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? 'Guardando…' : 'Guardar cliente'}</button>
        </div>
      </form>
    </ModalPos>
  );
};
