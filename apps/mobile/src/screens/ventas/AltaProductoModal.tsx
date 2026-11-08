import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { ModalFormulario, camposEstilos as s } from './ModalFormulario';

export interface CategoriaOpcion {
  id: string;
  nombre: string;
}

export interface DatosProducto {
  nombre: string;
  precio: number;
  categoriaId: string;
  categoriaNombre: string;
  sku: string;
  stockInicial: number;
}

interface Props {
  visible: boolean;
  categorias: CategoriaOpcion[];
  /** Saves the product on this device and in the local catalog. Throws an Error with the message to show. */
  onGuardar: (datos: DatosProducto) => Promise<void>;
  onCerrar: () => void;
}

const numero = (texto: string) => Number(texto.trim().replace(',', '.'));

/** Quick product registration for admins: one variant, no image. It can be sold offline right away. */
export const AltaProductoModal: React.FC<Props> = ({ visible, categorias, onGuardar, onCerrar }) => {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    setNombre(''); setPrecio(''); setCategoriaId(''); setSku(''); setStock(''); setError(null);
    onCerrar();
  };

  const guardar = async () => {
    if (guardando) return;
    const categoria = categorias.find((c) => c.id === categoriaId);
    if (!categoria) return setError('Elige una categoría.');
    if (precio.trim() === '' || !Number.isFinite(numero(precio))) return setError('Escribe un precio válido.');
    if (stock.trim() === '' || !Number.isInteger(numero(stock))) return setError('El stock inicial debe ser un número entero.');
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({ nombre, precio: numero(precio), categoriaId: categoria.id, categoriaNombre: categoria.nombre, sku, stockInicial: numero(stock) });
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalFormulario visible={visible} titulo="Alta rápida de producto" textoGuardar="Guardar producto" guardando={guardando} error={error} onGuardar={guardar} onCerrar={cerrar}>
      <Text style={{ fontSize: 12, color: colors.secondary }}>Sin imagen. Aparece en el catálogo de este equipo al instante y se envía cuando haya conexión.</Text>
      <View>
        <Text style={s.etiqueta}>Nombre</Text>
        <TextInput value={nombre} onChangeText={setNombre} style={s.input} placeholderTextColor={colors.textMuted} accessibilityLabel="Nombre del producto" />
      </View>
      <View>
        <Text style={s.etiqueta}>Precio</Text>
        <TextInput value={precio} onChangeText={setPrecio} keyboardType="decimal-pad" style={s.input} placeholderTextColor={colors.textMuted} accessibilityLabel="Precio" />
      </View>
      <View>
        <Text style={s.etiqueta}>Categoría</Text>
        {categorias.length === 0 ? (
          <Text style={{ fontSize: 13, color: colors.secondary }}>No hay categorías guardadas. Conecta el equipo a internet una vez para descargar el catálogo.</Text>
        ) : (
          <View style={styles.chips}>
            {categorias.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoriaId(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: categoriaId === c.id }}
                style={[styles.chip, categoriaId === c.id && styles.chipActivo]}
              >
                <Text style={[styles.chipTexto, categoriaId === c.id && { color: '#fff' }]}>{c.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View>
        <Text style={s.etiqueta}>SKU</Text>
        <TextInput value={sku} onChangeText={setSku} autoCapitalize="characters" autoCorrect={false} style={s.input} placeholderTextColor={colors.textMuted} accessibilityLabel="SKU" />
      </View>
      <View>
        <Text style={s.etiqueta}>Stock inicial</Text>
        <TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" style={s.input} placeholderTextColor={colors.textMuted} accessibilityLabel="Stock inicial" />
      </View>
    </ModalFormulario>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { fontSize: 13, fontWeight: '600', color: colors.text },
});
