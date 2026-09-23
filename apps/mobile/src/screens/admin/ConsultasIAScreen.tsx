import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, ReporteDinamicoResultado } from '../../services/admin.api';

export const ConsultasIAScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [prompt, setPrompt] = useState('');
  const [proveedor, setProveedor] = useState<'GROQ' | 'OLLAMA'>('GROQ');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ReporteDinamicoResultado | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mostrarSql, setMostrarSql] = useState(false);

  const handleEjecutarConsulta = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Por favor escribe tu consulta en lenguaje natural.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    try {
      const res = await adminApi.generarReporteDinamico(prompt.trim(), proveedor);
      setResultado(res);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error al procesar la consulta por IA.');
    } finally {
      setCargando(false);
    }
  };

  const esColumnaValida = (col: string): boolean => {
    const c = col.toLowerCase().trim();
    return !c.endsWith('id') && c !== 'id';
  };

  const columnasVisibles = (resultado?.columnas || []).filter(esColumnaValida);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultas por IA (Admin)</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* TARJETA DE INPUT */}
        <View style={styles.card}>
          <View style={styles.badgeAi}>
            <Ionicons name="sparkles" size={16} color="#4f46e5" />
            <Text style={styles.badgeAiText}>Asistente de Inteligencia Artificial SQL</Text>
          </View>

          <Text style={styles.inputLabel}>Escribe tu consulta en lenguaje natural:</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Ej: Muestra el top 5 de productos más vendidos este mes con su total facturado..."
            placeholderTextColor="#9ca3af"
            value={prompt}
            onChangeText={setPrompt}
          />

          {/* PROVEEDOR */}
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Modelo / Proveedor IA:</Text>
            <View style={styles.providerBtns}>
              <TouchableOpacity
                style={[styles.providerBtn, proveedor === 'GROQ' && styles.providerBtnActive]}
                onPress={() => setProveedor('GROQ')}
              >
                <Text style={[styles.providerBtnText, proveedor === 'GROQ' && styles.providerBtnTextActive]}>
                  Groq Cloud (Rápido)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.providerBtn, proveedor === 'OLLAMA' && styles.providerBtnActive]}
                onPress={() => setProveedor('OLLAMA')}
              >
                <Text style={[styles.providerBtnText, proveedor === 'OLLAMA' && styles.providerBtnTextActive]}>
                  Ollama (Local)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, cargando && { opacity: 0.7 }]}
            onPress={handleEjecutarConsulta}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="paper-plane" size={16} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.submitBtnText}>
              {cargando ? 'Generando reporte...' : 'Consultar Inteligencia Artificial'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ERROR */}
        {errorMsg && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* RESULTADOS */}
        {resultado && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Ionicons name="analytics" size={20} color="#059669" />
              <Text style={styles.resultTitle}>Reporte Dinámico Generado</Text>
            </View>

            {/* RESUMEN EXPLICATIVO */}
            <Text style={styles.resumenText}>{resultado.resumen}</Text>

            {/* TOGGLE CÓDIGO SQL */}
            {resultado.sql && (
              <View style={styles.sqlSection}>
                <TouchableOpacity
                  style={styles.sqlToggle}
                  onPress={() => setMostrarSql(!mostrarSql)}
                >
                  <Ionicons name="code-slash" size={16} color="#64748b" />
                  <Text style={styles.sqlToggleText}>
                    {mostrarSql ? 'Ocultar Consulta SQL' : 'Ver Consulta SQL Generada'}
                  </Text>
                </TouchableOpacity>

                {mostrarSql && (
                  <View style={styles.sqlBox}>
                    <Text style={styles.sqlCode}>{resultado.sql}</Text>
                  </View>
                )}
              </View>
            )}

            {/* TABLA DE RESULTADOS */}
            {resultado.filas && resultado.filas.length > 0 ? (
              <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View>
                    {/* ENCABEZADOS DE TABLA */}
                    <View style={styles.tableHeaderRow}>
                      {columnasVisibles.map((col) => (
                        <Text key={col} style={styles.tableHeaderCell}>
                          {col.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                      ))}
                    </View>

                    {/* FILAS DE RESULTADOS */}
                    {resultado.filas.map((row, idx) => (
                      <View key={idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                        {columnasVisibles.map((col) => (
                          <Text key={col} style={styles.tableCell}>
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyTable}>
                <Text style={styles.emptyTableText}>No se encontraron registros para la consulta.</Text>
              </View>
            )}

            <Text style={styles.footerTime}>
              Consulta procesada en {resultado.tiempoProcesamientoMs || 0} ms usando {resultado.proveedor}.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeAi: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeAiText: {
    fontSize: 11,
    color: '#4338ca',
    fontWeight: '700',
    marginLeft: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  providerRow: {
    marginTop: 14,
  },
  providerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  providerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  providerBtnActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  providerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  providerBtnTextActive: {
    color: '#fff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    flex: 1,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 8,
  },
  resumenText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 14,
  },
  sqlSection: {
    marginBottom: 14,
  },
  sqlToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sqlToggleText: {
    fontSize: 12,
    color: '#4f46e5',
    fontWeight: '600',
  },
  sqlBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  sqlCode: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#38bdf8',
  },
  tableWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderColor: '#cbd5e1',
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    minWidth: 100,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    minWidth: 100,
  },
  emptyTable: {
    padding: 20,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  footerTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'right',
  },
});
