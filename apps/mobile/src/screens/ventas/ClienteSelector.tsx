import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { ClienteVenta } from '../../services/pos/types';

interface Props {
  seleccionado: ClienteVenta | null;
  /** Customers to show for the search text, taken from the local cache (works offline). */
  buscar: (texto: string) => ClienteVenta[];
  onElegir: (cliente: ClienteVenta | null) => void;
  onRegistrar: () => void;
}

const MAX = 50;

/** Replaces the free-text customer field: shows the chosen customer and opens a searchable list of cached ones. */
export const ClienteSelector: React.FC<Props> = ({ seleccionado, buscar, onElegir, onRegistrar }) => {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const lista = buscar(texto);

  const cerrar = () => {
    setAbierto(false);
    setTexto('');
  };
  const elegir = (c: ClienteVenta | null) => {
    onElegir(c);
    cerrar();
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.etiqueta}>Cliente (opcional)</Text>
      <View style={styles.fila}>
        <TouchableOpacity onPress={() => setAbierto(true)} accessibilityRole="button" accessibilityLabel="Elegir cliente" style={[styles.elegir, { flex: 1 }]}>
          <Ionicons name="person-outline" size={18} color={colors.secondary} />
          <Text style={styles.elegirTexto} numberOfLines={1}>
            {seleccionado ? `${seleccionado.nombre}${seleccionado.apellido ? ` ${seleccionado.apellido}` : ''}${seleccionado.ci ? ` · ${seleccionado.ci}` : ''}` : 'Consumidor final (elegir cliente)'}
          </Text>
        </TouchableOpacity>
        {seleccionado && (
          <TouchableOpacity onPress={() => onElegir(null)} accessibilityRole="button" accessibilityLabel="Quitar cliente" style={styles.icono}>
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onRegistrar} accessibilityRole="button" accessibilityLabel="Registrar cliente" style={styles.icono}>
          <Ionicons name="person-add-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Modal visible={abierto} animationType="slide" onRequestClose={cerrar}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.cabecera}>
            <Text style={styles.titulo} accessibilityRole="header">Elegir cliente</Text>
            <TouchableOpacity onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.icono}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar por nombre, CI o celular"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            accessibilityLabel="Buscar cliente"
            style={styles.input}
          />
          <FlatList
            data={lista.slice(0, MAX)}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <TouchableOpacity onPress={() => elegir(null)} accessibilityRole="button" style={styles.item}>
                <Text style={styles.itemNombre}>Consumidor final (sin cliente)</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={<Text style={styles.vacio}>Ningún cliente coincide. Puedes registrarlo, incluso sin internet.</Text>}
            renderItem={({ item: c }) => (
              <TouchableOpacity onPress={() => elegir(c)} accessibilityRole="button" style={styles.item}>
                <Text style={styles.itemNombre}>{c.nombre}{c.apellido ? ` ${c.apellido}` : ''}</Text>
                <Text style={styles.itemMeta}>{[c.ci && `CI ${c.ci}`, c.celular].filter(Boolean).join(' · ') || 'Sin más datos'}</Text>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity onPress={() => { cerrar(); onRegistrar(); }} accessibilityRole="button" style={[styles.item, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                <Text style={[styles.itemNombre, { color: colors.primary }]}>Registrar cliente nuevo</Text>
              </TouchableOpacity>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  etiqueta: { fontSize: 12, fontWeight: '600', color: colors.secondary },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  elegir: {
    minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface,
  },
  elegirTexto: { flex: 1, fontSize: 14, color: colors.text },
  icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  titulo: { fontSize: 20, fontWeight: '700', color: colors.text },
  input: {
    minHeight: 44, margin: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12,
    fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
  item: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, justifyContent: 'center' },
  itemNombre: { fontSize: 14, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.secondary, marginTop: 1 },
  vacio: { padding: 20, textAlign: 'center', fontSize: 13, color: colors.secondary },
});
