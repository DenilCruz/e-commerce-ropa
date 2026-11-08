import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { ClienteLocal, ProductoLocal, RegistroCola } from '../../services/pos/types';
import { Accion, ESTADO } from './ColaSincronizacion';

interface Props {
  clientes: ClienteLocal[];
  productos: ProductoLocal[];
  onReintentarCliente: (id: string) => void;
  onUsarExistente: (id: string) => void;
  onCancelarCliente: (id: string) => void;
  onReintentarProducto: (id: string) => void;
  /** Changes the SKU of a product in conflict and queues it again. */
  onCambiarSku: (id: string, sku: string) => void;
  onCancelarProducto: (id: string) => void;
}

const Etiqueta: React.FC<{ r: RegistroCola }> = ({ r }) => {
  const e = ESTADO[r.estado];
  return (
    <View style={[styles.etiqueta, { backgroundColor: e.fondo, borderColor: e.borde }]}>
      <Ionicons name={e.icono} size={14} color={e.tinta} />
      <Text style={[styles.etiquetaTexto, { color: e.tinta }]}>{e.texto}</Text>
    </View>
  );
};

const FilaProducto: React.FC<{ p: ProductoLocal } & Pick<Props, 'onReintentarProducto' | 'onCambiarSku' | 'onCancelarProducto'>> = ({
  p, onReintentarProducto, onCambiarSku, onCancelarProducto,
}) => {
  const [sku, setSku] = useState(p.sku);
  return (
    <View style={styles.registro}>
      <Text style={styles.nombre}>{p.nombre} · SKU {p.sku}</Text>
      <Text style={styles.meta}>${p.precio.toFixed(2)} · stock inicial {p.stockInicial}{p.categoriaNombre ? ` · ${p.categoriaNombre}` : ''}</Text>
      <Etiqueta r={p} />
      {p.estado === 'PENDIENTE' && p.ultimoError ? <Text style={styles.ultimoError}>Último intento: {p.ultimoError}</Text> : null}
      {p.estado === 'CONFLICTO' && (
        <View style={styles.alerta}>
          <Text style={styles.alertaTitulo}>Ese SKU ya existe en la tienda. Cámbialo y vuelve a intentar, o cancela el producto.</Text>
          <TextInput
            value={sku}
            onChangeText={setSku}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Nuevo SKU"
            style={styles.input}
          />
          <View style={styles.acciones}>
            <Accion texto="Cambiar SKU y reintentar" variante="principal" onPress={() => onCambiarSku(p.id, sku)} />
            <Accion texto="Cancelar producto" variante="peligro" onPress={() => onCancelarProducto(p.id)} />
          </View>
        </View>
      )}
      {p.estado === 'ERROR' && (
        <View style={styles.alerta}>
          <Text style={styles.alertaTitulo}>{p.ultimoError ?? 'El servidor rechazó el producto.'}</Text>
          <View style={styles.acciones}>
            <Accion texto="Reintentar" onPress={() => onReintentarProducto(p.id)} />
            <Accion texto="Cancelar producto" variante="peligro" onPress={() => onCancelarProducto(p.id)} />
          </View>
        </View>
      )}
    </View>
  );
};

/** Customers and products registered on this device and their sync state, with the actions to resolve problems. */
export const ColaRegistros: React.FC<Props> = (props) => {
  const { clientes, productos } = props;
  const clientesVisibles = clientes.filter((c) => !c.fusionadoCon || c.estado !== 'SINCRONIZADA');
  if (clientesVisibles.length === 0 && productos.length === 0) return null;

  return (
    <View style={styles.tarjeta}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Clientes y productos de este equipo</Text>
        <Text style={styles.subtitulo}>Se envían antes que las ventas para que la venta nunca llegue sin su cliente o su producto.</Text>
      </View>

      {clientesVisibles.map((c) => (
        <View key={c.id} style={styles.registro}>
          <Text style={styles.nombre}>Cliente: {c.nombre}{c.apellido ? ` ${c.apellido}` : ''}{c.ci ? ` · CI ${c.ci}` : ''}</Text>
          <Etiqueta r={c} />
          {c.estado === 'PENDIENTE' && c.ultimoError ? <Text style={styles.ultimoError}>Último intento: {c.ultimoError}</Text> : null}
          {c.estado === 'CONFLICTO' && c.conflicto && (
            <View style={styles.alerta}>
              <Text style={styles.alertaTitulo}>
                Ya existe un cliente con ese CI: {c.conflicto.existente.nombre}. ¿Usar el existente o cancelar?
              </Text>
              <View style={styles.acciones}>
                <Accion texto="Usar el existente" variante="principal" onPress={() => props.onUsarExistente(c.id)} />
                <Accion texto="Cancelar cliente" variante="peligro" onPress={() => props.onCancelarCliente(c.id)} />
              </View>
            </View>
          )}
          {c.estado === 'ERROR' && (
            <View style={styles.alerta}>
              <Text style={styles.alertaTitulo}>{c.ultimoError ?? 'El servidor rechazó el cliente.'}</Text>
              <View style={styles.acciones}>
                <Accion texto="Reintentar" onPress={() => props.onReintentarCliente(c.id)} />
                <Accion texto="Cancelar cliente" variante="peligro" onPress={() => props.onCancelarCliente(c.id)} />
              </View>
            </View>
          )}
        </View>
      ))}

      {productos.map((p) => (
        <FilaProducto
          key={p.id}
          p={p}
          onReintentarProducto={props.onReintentarProducto}
          onCambiarSku={props.onCambiarSku}
          onCancelarProducto={props.onCancelarProducto}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tarjeta: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 16, overflow: 'hidden' },
  cabecera: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  titulo: { fontSize: 16, fontWeight: '700', color: colors.text },
  subtitulo: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  registro: { padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  nombre: { fontSize: 14, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.secondary },
  etiqueta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  etiquetaTexto: { fontSize: 12, fontWeight: '600' },
  alerta: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, gap: 8 },
  alertaTitulo: { fontSize: 13, fontWeight: '600', color: '#7f1d1d' },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ultimoError: { fontSize: 12, color: '#92400e' },
  input: {
    minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12,
    fontSize: 14, color: colors.text, backgroundColor: '#fff',
  },
});
