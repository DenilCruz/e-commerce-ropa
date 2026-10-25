import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { RETENCION_DIAS, ventaAntigua } from '../../services/pos/retencion';
import { EstadoVentaLocal, VentaLocal } from '../../services/pos/types';

interface Props {
  ventas: VentaLocal[];
  onReintentar: (id: string) => void;
  onAjustar: (venta: VentaLocal) => void;
  onCancelar: (id: string) => void;
  onLimpiar: () => void;
}

const ESTADO: Record<EstadoVentaLocal, { texto: string; icono: keyof typeof Ionicons.glyphMap; fondo: string; borde: string; tinta: string }> = {
  PENDIENTE: { texto: 'Pendiente de sincronización', icono: 'time-outline', fondo: '#fffbeb', borde: '#fde68a', tinta: '#78350f' },
  SINCRONIZANDO: { texto: 'Sincronizando', icono: 'sync-outline', fondo: '#eff6ff', borde: '#bfdbfe', tinta: '#1e40af' },
  SINCRONIZADA: { texto: 'Sincronizada', icono: 'checkmark-circle-outline', fondo: '#ecfdf5', borde: '#a7f3d0', tinta: '#065f46' },
  CONFLICTO: { texto: 'Venta en conflicto / quiebre de stock', icono: 'warning-outline', fondo: '#fef2f2', borde: '#fecaca', tinta: '#991b1b' },
  ERROR: { texto: 'Rechazada por el servidor', icono: 'close-circle-outline', fondo: '#fef2f2', borde: '#fecaca', tinta: '#991b1b' },
};

const Accion: React.FC<{ texto: string; onPress: () => void; variante?: 'principal' | 'neutra' | 'peligro' }> = ({
  texto,
  onPress,
  variante = 'neutra',
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    style={[styles.accion, variante === 'principal' && styles.accionPrincipal, variante === 'peligro' && styles.accionPeligro]}
  >
    <Text style={[styles.accionTexto, variante === 'principal' && { color: '#fff' }, variante === 'peligro' && { color: '#991b1b' }]}>
      {texto}
    </Text>
  </TouchableOpacity>
);

export const ColaSincronizacion: React.FC<Props> = ({ ventas, onReintentar, onAjustar, onCancelar, onLimpiar }) => {
  const hayHechas = ventas.some((v) => v.estado === 'SINCRONIZADA');
  const ordenadas = [...ventas].reverse();

  return (
    <View style={styles.tarjeta}>
      <View style={styles.cabecera}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Cola de sincronización</Text>
          <Text style={styles.subtitulo}>Las ventas se guardan en este equipo y se envían en el orden en que se hicieron.</Text>
        </View>
        {hayHechas && <Accion texto="Quitar sincronizadas" onPress={onLimpiar} />}
      </View>

      {ordenadas.length === 0 ? (
        <Text style={styles.vacio}>No hay ventas guardadas en este equipo.</Text>
      ) : (
        ordenadas.map((v) => {
          const e = ESTADO[v.estado];
          const antigua = v.estado !== 'SINCRONIZADA' && ventaAntigua(v.creadoEn);
          return (
            <View key={v.id} style={styles.venta}>
              <View style={styles.ventaCabecera}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ventaItems}>{v.items.map((i) => `${i.cantidad} × ${i.nombre} (${i.talla}, ${i.color})`).join(' · ')}</Text>
                  <Text style={styles.ventaMeta}>
                    {new Date(v.creadoEn).toLocaleString('es-BO')}
                    {v.clienteNombre ? ` · ${v.clienteNombre}` : ''}
                    {v.ordenNro ? ` · Pedido ${v.ordenNro}` : ''}
                  </Text>
                </View>
                <Text style={styles.ventaTotal}>${v.total.toFixed(2)}</Text>
              </View>

              <View style={styles.etiquetas}>
                <View style={[styles.etiqueta, { backgroundColor: e.fondo, borderColor: e.borde }]}>
                  <Ionicons name={e.icono} size={14} color={e.tinta} />
                  <Text style={[styles.etiquetaTexto, { color: e.tinta }]}>{e.texto}</Text>
                </View>
                {antigua && (
                  <View style={[styles.etiqueta, { backgroundColor: '#f5f5f4', borderColor: colors.border }]}>
                    <Ionicons name="hourglass-outline" size={14} color={colors.secondary} />
                    <Text style={[styles.etiquetaTexto, { color: colors.secondary }]}>Antigua (más de {RETENCION_DIAS} días)</Text>
                  </View>
                )}
              </View>

              {v.estado === 'CONFLICTO' && (
                <View style={styles.alerta}>
                  <Text style={styles.alertaTitulo}>
                    Otro vendedor se llevó parte del stock antes de que esta venta llegara. No se cobró ni se descontó nada.
                  </Text>
                  {(v.conflicto ?? []).map((c) => (
                    <Text key={c.varianteId} style={styles.alertaTexto}>
                      • {c.nombre ?? 'Prenda'}: pediste {c.solicitado}, quedan {c.disponible}.
                    </Text>
                  ))}
                  <View style={styles.acciones}>
                    <Accion texto="Vender solo lo disponible" onPress={() => onAjustar(v)} variante="principal" />
                    <Accion texto="Reintentar (ya repuse stock)" onPress={() => onReintentar(v.id)} />
                    <Accion texto="Cancelar venta" onPress={() => onCancelar(v.id)} variante="peligro" />
                  </View>
                </View>
              )}

              {v.estado === 'ERROR' && (
                <View style={styles.alerta}>
                  <Text style={styles.alertaTitulo}>{v.ultimoError ?? 'El servidor rechazó la venta.'}</Text>
                  <View style={styles.acciones}>
                    <Accion texto="Reintentar" onPress={() => onReintentar(v.id)} />
                    <Accion texto="Cancelar venta" onPress={() => onCancelar(v.id)} variante="peligro" />
                  </View>
                </View>
              )}

              {v.estado === 'PENDIENTE' && (
                <View>
                  {v.ultimoError ? <Text style={styles.ultimoError}>Último intento: {v.ultimoError}</Text> : null}
                  <View style={styles.acciones}>
                    <Accion texto="Cancelar venta" onPress={() => onCancelar(v.id)} />
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tarjeta: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 16, overflow: 'hidden' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  titulo: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitulo: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  vacio: { padding: 24, textAlign: 'center', fontSize: 13, color: colors.secondary },
  venta: { padding: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  ventaCabecera: { flexDirection: 'row', gap: 12 },
  ventaItems: { fontSize: 14, fontWeight: '600', color: colors.text },
  ventaMeta: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  ventaTotal: { fontSize: 15, fontWeight: '700', color: colors.text },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  etiquetaTexto: { fontSize: 12, fontWeight: '600' },
  alerta: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, gap: 4 },
  alertaTitulo: { fontSize: 13, fontWeight: '600', color: '#7f1d1d' },
  alertaTexto: { fontSize: 13, color: '#7f1d1d' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  accion: {
    minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  accionPrincipal: { backgroundColor: colors.primary, borderColor: colors.primary },
  accionPeligro: { borderColor: '#fca5a5', backgroundColor: '#fff' },
  accionTexto: { fontSize: 13, fontWeight: '600', color: colors.text },
  ultimoError: { fontSize: 12, color: '#92400e' },
});
