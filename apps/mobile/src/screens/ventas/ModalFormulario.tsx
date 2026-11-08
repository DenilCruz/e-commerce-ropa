import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';

interface Props {
  visible: boolean;
  titulo: string;
  error?: string | null;
  guardando?: boolean;
  textoGuardar: string;
  onGuardar: () => void;
  onCerrar: () => void;
  children: React.ReactNode;
}

/** In-screen modal shell shared by the customer and product forms: title, scrollable body, save and cancel. */
export const ModalFormulario: React.FC<Props> = ({ visible, titulo, error, guardando, textoGuardar, onGuardar, onCerrar, children }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fondo}>
      <View style={styles.hoja}>
        <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
          {children}
          {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
        </ScrollView>
        <View style={styles.acciones}>
          <TouchableOpacity onPress={onCerrar} accessibilityRole="button" style={styles.boton}>
            <Text style={styles.botonTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onGuardar}
            disabled={guardando}
            accessibilityRole="button"
            style={[styles.boton, styles.botonPrincipal, guardando && { opacity: 0.6 }]}
          >
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={[styles.botonTexto, { color: '#fff' }]}>{textoGuardar}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '90%', gap: 12 },
  titulo: { fontSize: 18, fontWeight: '700', color: colors.text },
  error: { fontSize: 13, color: '#991b1b', backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, overflow: 'hidden' },
  acciones: { flexDirection: 'row', gap: 10 },
  boton: { flex: 1, minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  botonPrincipal: { backgroundColor: colors.primary, borderColor: colors.primary },
  botonTexto: { fontSize: 15, fontWeight: '700', color: colors.text },
});

export const camposEstilos = StyleSheet.create({
  etiqueta: { fontSize: 12, fontWeight: '600', color: colors.secondary, marginBottom: 4 },
  input: {
    minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12,
    fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
});
