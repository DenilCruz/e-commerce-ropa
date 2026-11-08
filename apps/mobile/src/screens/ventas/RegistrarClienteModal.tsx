import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '../../theme';
import { ModalFormulario, camposEstilos as s } from './ModalFormulario';

export interface DatosCliente {
  nombre: string;
  apellido?: string;
  celular?: string;
  ci?: string;
  correo?: string;
}

interface Props {
  visible: boolean;
  /** Saves the customer on this device; it works without internet. Throws an Error with the message to show. */
  onGuardar: (datos: DatosCliente) => Promise<void>;
  onCerrar: () => void;
}

export const RegistrarClienteModal: React.FC<Props> = ({ visible, onGuardar, onCerrar }) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [celular, setCelular] = useState('');
  const [ci, setCi] = useState('');
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    setNombre(''); setApellido(''); setCelular(''); setCi(''); setCorreo(''); setError(null);
    onCerrar();
  };

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({ nombre, apellido, celular, ci, correo });
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const campo = (etiqueta: string, valor: string, cambiar: (t: string) => void, extra: object = {}) => (
    <View>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <TextInput value={valor} onChangeText={cambiar} placeholderTextColor={colors.textMuted} style={s.input} accessibilityLabel={etiqueta} {...extra} />
    </View>
  );

  return (
    <ModalFormulario visible={visible} titulo="Registrar cliente" textoGuardar="Guardar cliente" guardando={guardando} error={error} onGuardar={guardar} onCerrar={cerrar}>
      <Text style={{ fontSize: 12, color: colors.secondary }}>Se guarda en este equipo y se envía al servidor cuando haya conexión.</Text>
      {campo('Nombre', nombre, setNombre, { maxLength: 80 })}
      {campo('Apellido (opcional)', apellido, setApellido, { maxLength: 80 })}
      {campo('Celular (opcional)', celular, setCelular, { maxLength: 20, keyboardType: 'phone-pad' })}
      {campo('CI (opcional)', ci, setCi, { maxLength: 20, autoCapitalize: 'characters' })}
      {campo('Correo (opcional)', correo, setCorreo, { keyboardType: 'email-address', autoCapitalize: 'none' })}
    </ModalFormulario>
  );
};
