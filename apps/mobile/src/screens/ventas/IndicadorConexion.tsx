import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface Props {
  isOnline: boolean;
  pendientes: number;
  sincronizando: boolean;
  actualizadoEn: string | null;
  onSincronizar: () => void;
}

function hace(iso: string | null): string {
  if (!iso) return 'nunca';
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  return horas < 24 ? `hace ${horas} h` : `hace ${Math.round(horas / 24)} d`;
}

export const IndicadorConexion: React.FC<Props> = ({ isOnline, pendientes, sincronizando, actualizadoEn, onSincronizar }) => (
  <View style={styles.wrap}>
    <View style={styles.fila}>
      <View
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        style={[styles.pildora, isOnline ? styles.pildoraOnline : styles.pildoraOffline]}
      >
        <Ionicons name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'} size={16} color={isOnline ? '#166534' : '#92400e'} />
        <Text style={[styles.pildoraTexto, { color: isOnline ? '#166534' : '#92400e' }]}>{isOnline ? 'En línea' : 'Sin conexión'}</Text>
        {pendientes > 0 && (
          <View style={styles.contador}>
            <Text style={styles.contadorTexto}>{pendientes} por enviar</Text>
          </View>
        )}
      </View>
      <TouchableOpacity
        onPress={onSincronizar}
        disabled={!isOnline || sincronizando}
        accessibilityRole="button"
        accessibilityLabel="Sincronizar ahora"
        style={[styles.boton, (!isOnline || sincronizando) && styles.botonInactivo]}
      >
        {sincronizando ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Ionicons name="sync-outline" size={16} color={colors.text} />
        )}
        <Text style={styles.botonTexto}>{sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.nota}>
      Catálogo guardado en este equipo: <Text style={styles.notaFuerte}>{hace(actualizadoEn)}</Text>
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  pildoraOnline: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  pildoraOffline: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  pildoraTexto: { fontSize: 13, fontWeight: '600' },
  contador: { backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  contadorTexto: { color: '#fff', fontSize: 11, fontWeight: '700' },
  boton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface,
  },
  botonInactivo: { opacity: 0.5 },
  botonTexto: { fontSize: 13, fontWeight: '600', color: colors.text },
  nota: { fontSize: 12, color: colors.secondary },
  notaFuerte: { fontWeight: '600', color: colors.text },
});
