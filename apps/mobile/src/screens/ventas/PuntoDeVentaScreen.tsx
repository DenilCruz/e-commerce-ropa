import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { getImageUrl } from '../../services/api';
import { useVentasPos } from '../../hooks/useVentasPos';
import { CatalogoVencidoError, StockLocalInsuficienteError } from '../../services/pos/ventasLocales';
import { RETENCION_DIAS } from '../../services/pos/retencion';
import { VarianteCatalogo } from '../../services/pos/types';
import { ColaSincronizacion } from './ColaSincronizacion';
import { IndicadorConexion } from './IndicadorConexion';

const MAX_RESULTADOS = 60;

const mensajeDeError = (err: unknown, porDefecto: string) =>
  err instanceof StockLocalInsuficienteError || err instanceof CatalogoVencidoError ? err.message : porDefecto;

export const PuntoDeVentaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const pos = useVentasPos();
  const [busqueda, setBusqueda] = useState('');
  const [ticket, setTicket] = useState<Map<string, number>>(new Map());
  const [cliente, setCliente] = useState('');
  const [registrando, setRegistrando] = useState(false);
  // State updates are asynchronous: only a ref stops a button pressed several times in the same instant
  const registrandoRef = useRef(false);

  const porId = useMemo(() => new Map(pos.catalogo.map((v) => [v.varianteId, v])), [pos.catalogo]);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q
      ? pos.catalogo.filter((v) => `${v.nombre} ${v.sku} ${v.talla} ${v.color} ${v.categoria ?? ''}`.toLowerCase().includes(q))
      : pos.catalogo;
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre) || a.talla.localeCompare(b.talla));
  }, [pos.catalogo, busqueda]);

  const lineas = [...ticket.entries()]
    .map(([id, cantidad]) => ({ variante: porId.get(id), cantidad }))
    .filter((l): l is { variante: VarianteCatalogo; cantidad: number } => !!l.variante);
  const total = lineas.reduce((s, l) => s + l.variante.precio * l.cantidad, 0);

  const cambiar = (id: string, delta: number) => {
    const variante = porId.get(id);
    if (!variante) return;
    setTicket((prev) => {
      const siguiente = new Map(prev);
      const cantidad = Math.min((prev.get(id) ?? 0) + delta, variante.stockLocal);
      if (cantidad <= 0) siguiente.delete(id);
      else siguiente.set(id, cantidad);
      return siguiente;
    });
  };

  const registrar = async () => {
    if (!lineas.length || registrandoRef.current) return;
    registrandoRef.current = true;
    setRegistrando(true);
    try {
      const venta = await pos.vender(
        lineas.map((l) => ({ varianteId: l.variante.varianteId, cantidad: l.cantidad })),
        cliente,
      );
      setTicket(new Map());
      setCliente('');
      Alert.alert(
        pos.isOnline ? 'Venta registrada' : 'Venta guardada',
        pos.isOnline
          ? `Venta registrada por $${venta.total.toFixed(2)}. Se enviará al servidor de inmediato.`
          : `Venta guardada en este equipo por $${venta.total.toFixed(2)}. Se enviará cuando vuelva la conexión.`,
      );
    } catch (err) {
      Alert.alert('No se pudo registrar', mensajeDeError(err, 'No se pudo guardar la venta en este equipo.'));
    } finally {
      registrandoRef.current = false;
      setRegistrando(false);
    }
  };

  const conAccion = (fn: () => Promise<unknown>, errorTexto: string) => () =>
    fn().catch((err) => Alert.alert('Error', mensajeDeError(err, errorTexto)));

  const confirmarCancelar = (id: string) =>
    Alert.alert('Cancelar venta', 'La venta se eliminará de este equipo y el stock reservado quedará libre.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar venta', style: 'destructive', onPress: conAccion(() => pos.cancelar(id), 'No se pudo cancelar la venta.') },
    ]);

  const bloqueada = !pos.sesion || !pos.listo || pos.catalogoVencido;

  const renderVariante = ({ item: v }: { item: VarianteCatalogo }) => {
    const enTicket = ticket.get(v.varianteId) ?? 0;
    const libre = v.stockLocal - enTicket;
    return (
      <View style={styles.fila}>
        <Image source={{ uri: getImageUrl(v.imagen) }} style={styles.foto} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.filaNombre} numberOfLines={1}>{v.nombre}</Text>
          <Text style={styles.filaMeta}>{v.talla} · {v.color} · {v.sku}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.filaPrecio}>${v.precio.toFixed(2)}</Text>
          <Text style={[styles.filaStock, v.stockLocal === 0 && { color: colors.danger, fontWeight: '600' }]}>
            {v.stockLocal === 0 ? 'Agotado' : `${v.stockLocal} disp.`}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => cambiar(v.varianteId, 1)}
          disabled={libre <= 0}
          accessibilityRole="button"
          accessibilityLabel={`Agregar ${v.nombre}, talla ${v.talla}, color ${v.color}`}
          style={[styles.agregar, libre <= 0 && styles.agregarInactivo]}
        >
          <Ionicons name="add" size={22} color={libre <= 0 ? colors.textMuted : '#fff'} />
        </TouchableOpacity>
      </View>
    );
  };

  const cabecera = (
    <View style={{ gap: 14 }}>
      <View style={styles.encabezado}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Volver" style={styles.volver}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Punto de venta</Text>
          <Text style={styles.subtitulo}>Ventas de mostrador en efectivo. Funciona sin internet y sincroniza al volver.</Text>
        </View>
      </View>

      <IndicadorConexion
        isOnline={pos.isOnline}
        pendientes={pos.pendientes}
        sincronizando={pos.sincronizando}
        actualizadoEn={pos.actualizadoEn}
        onSincronizar={pos.sincronizarAhora}
      />

      {pos.errorDb && <Text style={[styles.banner, styles.bannerError]}>{pos.errorDb}</Text>}
      {!pos.sesion && (
        <Text style={[styles.banner, styles.bannerAviso]}>No se pudo leer tu sesión de tienda. Cierra sesión y vuelve a entrar.</Text>
      )}
      {pos.catalogoVencido && (
        <Text style={[styles.banner, styles.bannerAviso]}>
          El catálogo de este equipo tiene más de {RETENCION_DIAS} días y ya no se pueden registrar ventas sin conexión. Conéctate a internet para renovarlo. Las ventas ya guardadas se enviarán igual.
        </Text>
      )}
      {pos.aviso && (
        <TouchableOpacity onPress={pos.descartarAviso} accessibilityRole="button" accessibilityHint="Toca para cerrar el aviso">
          <Text style={[styles.banner, pos.aviso.tipo === 'ok' ? styles.bannerOk : pos.aviso.tipo === 'error' ? styles.bannerError : styles.bannerAviso]}>
            {pos.aviso.texto}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Venta actual</Text>
        {lineas.length === 0 ? (
          <Text style={styles.vacio}>Agrega prendas desde el catálogo.</Text>
        ) : (
          lineas.map(({ variante: v, cantidad }) => (
            <View key={v.varianteId} style={styles.lineaTicket}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filaNombre} numberOfLines={1}>{v.nombre}</Text>
                <Text style={styles.filaMeta}>{v.talla} · {v.color} · ${v.precio.toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => cambiar(v.varianteId, -1)} accessibilityRole="button" accessibilityLabel={`Quitar una unidad de ${v.nombre}`} style={styles.cantidadBtn}>
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.cantidad}>{cantidad}</Text>
              <TouchableOpacity
                onPress={() => cambiar(v.varianteId, 1)}
                disabled={cantidad >= v.stockLocal}
                accessibilityRole="button"
                accessibilityLabel={`Agregar una unidad de ${v.nombre}`}
                style={[styles.cantidadBtn, cantidad >= v.stockLocal && { opacity: 0.4 }]}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => cambiar(v.varianteId, -cantidad)} accessibilityRole="button" accessibilityLabel={`Quitar ${v.nombre} de la venta`} style={styles.cantidadBtn}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.etiquetaCampo}>Cliente (opcional)</Text>
        <TextInput value={cliente} onChangeText={setCliente} maxLength={120} style={styles.input} placeholderTextColor={colors.textMuted} />

        <View style={styles.totalFila}>
          <Text style={styles.totalTexto}>Total en efectivo</Text>
          <Text style={styles.totalMonto}>${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          onPress={registrar}
          disabled={!lineas.length || registrando || bloqueada}
          accessibilityRole="button"
          style={[styles.vender, (!lineas.length || registrando || bloqueada) && styles.venderInactivo]}
        >
          {registrando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.venderTexto}>{pos.isOnline ? 'Registrar venta' : 'Guardar venta en este equipo'}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.nota}>
          Solo efectivo. {pos.isOnline
            ? 'La venta se guarda aquí y se envía de inmediato.'
            : 'Sin conexión: la venta queda guardada y se enviará sola cuando vuelva internet. Tarjeta y QR necesitan conexión y no están disponibles ahora.'}
        </Text>
      </View>

      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por nombre, SKU, talla o color"
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        accessibilityLabel="Buscar prenda"
        style={styles.input}
      />
    </View>
  );

  const vacioCatalogo =
    pos.catalogo.length === 0
      ? 'Este equipo todavía no tiene el catálogo guardado. Conéctalo a internet una vez para descargarlo; después podrás vender sin conexión.'
      : `Ninguna prenda coincide con “${busqueda}”.`;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <FlatList
        data={resultados.slice(0, MAX_RESULTADOS)}
        keyExtractor={(v) => v.varianteId}
        renderItem={renderVariante}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.contenido}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={<Text style={styles.vacio}>{vacioCatalogo}</Text>}
        ListFooterComponent={
          <View>
            {resultados.length > MAX_RESULTADOS && (
              <Text style={styles.vacio}>Mostrando {MAX_RESULTADOS} de {resultados.length}. Afina la búsqueda para ver el resto.</Text>
            )}
            <ColaSincronizacion
              ventas={pos.ventas}
              onReintentar={(id) => conAccion(() => pos.reintentar(id), 'No se pudo reintentar la venta.')()}
              onAjustar={(v) => conAccion(() => pos.ajustar(v), 'No se pudo ajustar la venta.')()}
              onCancelar={confirmarCancelar}
              onLimpiar={() => conAccion(pos.limpiarSincronizadas, 'No se pudo limpiar la lista.')()}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colors.background },
  contenido: { padding: 16, paddingBottom: 48 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  volver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitulo: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  banner: { fontSize: 13, borderWidth: 1, borderRadius: 10, padding: 12, overflow: 'hidden' },
  bannerOk: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' },
  bannerAviso: { backgroundColor: '#fffbeb', borderColor: '#fcd34d', color: '#78350f' },
  bannerError: { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' },
  tarjeta: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 },
  tarjetaTitulo: { fontSize: 16, fontWeight: '700', color: colors.text },
  vacio: { padding: 20, textAlign: 'center', fontSize: 13, color: colors.secondary },
  lineaTicket: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cantidadBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cantidad: { minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.text },
  etiquetaCampo: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  input: {
    minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12,
    fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
  totalFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  totalTexto: { fontSize: 14, color: colors.secondary },
  totalMonto: { fontSize: 24, fontWeight: '800', color: colors.text },
  vender: { minHeight: 48, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  venderInactivo: { backgroundColor: '#d6d3d1' },
  venderTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  nota: { fontSize: 12, color: colors.secondary },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  foto: { width: 44, height: 56, borderRadius: 6, backgroundColor: colors.surfaceWarm },
  filaNombre: { fontSize: 14, fontWeight: '600', color: colors.text },
  filaMeta: { fontSize: 12, color: colors.secondary, marginTop: 1 },
  filaPrecio: { fontSize: 14, fontWeight: '700', color: colors.text },
  filaStock: { fontSize: 12, color: colors.secondary },
  agregar: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  agregarInactivo: { backgroundColor: '#e7e5e4' },
});
