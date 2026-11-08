import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { RETENCION_MAX, RETENCION_MIN, validarDiasRetencion } from '../../services/pos/retencion';

interface Props {
  dias: number;
  enLinea: boolean;
  onGuardar: (dias: number) => Promise<number>;
}

/** Store owner control (ADMIN): how many days this store keeps unsynced data on its devices. */
export const ConfigRetencion: React.FC<Props> = ({ dias, enLinea, onGuardar }) => {
  const [valor, setValor] = useState(String(dias));
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setValor(String(dias));
  }, [dias]);

  const guardar = async () => {
    const n = validarDiasRetencion(valor);
    if (n === null) {
      setMensaje({ tipo: 'error', texto: `Escribe un número entero de ${RETENCION_MIN} a ${RETENCION_MAX}.` });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const guardado = await onGuardar(n);
      setValor(String(guardado));
      setMensaje({ tipo: 'ok', texto: `Listo: lo guardado sin conexión se conserva ${guardado} día(s).` });
    } catch (err: unknown) {
      const detalle = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setMensaje({
        tipo: 'error',
        texto: (Array.isArray(detalle) ? detalle.join(' ') : detalle) || 'No se pudo guardar. Revisa tu conexión.',
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.caja}>
      <Text style={styles.titulo}>Conservación sin conexión</Text>
      <Text style={styles.ayuda}>
        Días que se guarda lo guardado sin conexión. De {RETENCION_MIN} a {RETENCION_MAX}. Aplica a todos los equipos de la tienda.
      </Text>
      <View style={styles.fila}>
        <TextInput
          value={valor}
          onChangeText={setValor}
          keyboardType="number-pad"
          editable={enLinea && !guardando}
          accessibilityLabel="Días que se guarda lo guardado sin conexión"
          style={styles.input}
        />
        <TouchableOpacity
          onPress={guardar}
          disabled={!enLinea || guardando}
          accessibilityRole="button"
          style={[styles.boton, (!enLinea || guardando) && styles.botonInactivo]}
        >
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar</Text>}
        </TouchableOpacity>
      </View>
      {!enLinea ? <Text style={styles.ayuda}>Necesitas conexión para cambiar este valor.</Text> : null}
      {mensaje ? <Text style={mensaje.tipo === 'error' ? styles.error : styles.ok}>{mensaje.texto}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  caja: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  titulo: { fontSize: 16, fontWeight: '700', color: colors.text },
  ayuda: { fontSize: 12, color: colors.secondary },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    width: 88,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  boton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonInactivo: { backgroundColor: '#d6d3d1' },
  botonTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { fontSize: 13, color: '#991b1b' },
  ok: { fontSize: 13, color: '#065f46' },
});
