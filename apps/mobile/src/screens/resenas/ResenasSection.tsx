import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import {
  resenasApi,
  Resena,
  ResumenResenas,
  EstadoCompraResena,
} from '../../services/resenas.api';

interface Props {
  productoId: string;
}

export const ResenasSection: React.FC<Props> = ({ productoId }) => {
  const { user, isAuthenticated } = useAuthStore();

  const [resenas, setResenas] = useState<Resena[]>([]);
  const [resumen, setResumen] = useState<ResumenResenas | null>(null);
  const [estadoCompra, setEstadoCompra] = useState<EstadoCompraResena | null>(null);
  const [cargando, setCargando] = useState(true);

  // Formulario para nueva reseña (HU-66)
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarDatosResenas = useCallback(async () => {
    try {
      const [lista, res] = await Promise.all([
        resenasApi.obtenerPorProducto(productoId),
        resenasApi.obtenerResumenProducto(productoId),
      ]);
      setResenas(lista);
      setResumen(res);

      if (isAuthenticated && user) {
        const est = await resenasApi.verificarCompra(productoId, user.id);
        setEstadoCompra(est);
      }
    } catch (err) {
      console.error('Error cargando reseñas en móvil:', err);
    } finally {
      setCargando(false);
    }
  }, [productoId, isAuthenticated, user]);

  useEffect(() => {
    cargarDatosResenas();
  }, [cargarDatosResenas]);

  const handleSubmitResena = async () => {
    if (!user) return;
    if (!comentario.trim()) {
      Alert.alert('Comentario requerido', 'Por favor escribe una opinión sobre el producto.');
      return;
    }

    setEnviando(true);
    try {
      await resenasApi.crear({
        productoId,
        usuarioId: user.id,
        calificacion,
        comentario: comentario.trim(),
      });
      setComentario('');
      setMostrarFormulario(false);
      Alert.alert('¡Gracias!', 'Tu reseña ha sido publicada con éxito.');
      await cargarDatosResenas();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No se pudo publicar la reseña.';
      Alert.alert('Error', msg);
    } finally {
      setEnviando(false);
    }
  };

  const handleEliminarMiResena = (resenaId: string) => {
    if (!user) return;
    Alert.alert(
      'Eliminar Reseña',
      '¿Estás seguro de que deseas eliminar tu opinión sobre este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await resenasApi.eliminar(resenaId, user.id);
              await cargarDatosResenas();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la reseña.');
            }
          },
        },
      ],
    );
  };

  const renderEstrellas = (rating: number, size = 16) => {
    const estrellas = [];
    for (let i = 1; i <= 5; i++) {
      estrellas.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color="#f59e0b"
          style={{ marginRight: 2 }}
        />,
      );
    }
    return <View style={styles.starsContainer}>{estrellas}</View>;
  };

  if (cargando) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  const promedioNum = Number(resumen?.promedio || 0);
  const totalResenas = resumen?.total || 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Opiniones y Valoraciones</Text>

      {/* RESUMEN DE CALIFICACIONES (HU-70) */}
      <View style={styles.summaryCard}>
        <View style={styles.scoreBox}>
          <Text style={styles.bigScore}>{promedioNum.toFixed(1)}</Text>
          {renderEstrellas(Math.round(promedioNum), 18)}
          <Text style={styles.totalText}>
            {totalResenas} {totalResenas === 1 ? 'opinión' : 'opiniones'}
          </Text>
        </View>

        {/* DESGLOSE POR ESTRELLAS */}
        {resumen?.distribucion && (
          <View style={styles.barsContainer}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = (resumen.distribucion as any)[star] || 0;
              const pct = totalResenas > 0 ? (count / totalResenas) * 100 : 0;
              return (
                <View key={star} style={styles.barRow}>
                  <Text style={styles.barLabel}>{star}★</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* HU-66: VALIDACIÓN DE COMPRA PARA OPINAR */}
      {isAuthenticated && user && (
        <View style={styles.actionSection}>
          {estadoCompra?.comproProducto && !estadoCompra?.yaReseno ? (
            !mostrarFormulario ? (
              <TouchableOpacity
                style={styles.openFormBtn}
                onPress={() => setMostrarFormulario(true)}
              >
                <Ionicons name="create-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.openFormBtnText}>Escribir una reseña</Text>
              </TouchableOpacity>
            ) : (
              /* FORMULARIO DE RESEÑA */
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>Tu Calificación</Text>

                {/* SELECTOR DE ESTRELLAS */}
                <View style={styles.ratingPicker}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setCalificacion(star)}
                      style={styles.starPickerBtn}
                    >
                      <Ionicons
                        name={star <= calificacion ? 'star' : 'star-outline'}
                        size={28}
                        color="#f59e0b"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder="Comparte tu experiencia con la prenda (calidad, talla, tela)..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  value={comentario}
                  onChangeText={setComentario}
                  textAlignVertical="top"
                />

                <View style={styles.formButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setMostrarFormulario(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    disabled={enviando}
                    onPress={handleSubmitResena}
                  >
                    {enviando ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Publicar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )
          ) : !estadoCompra?.comproProducto ? (
            <View style={styles.noticeBox}>
              <Ionicons name="lock-closed-outline" size={16} color="#6b7280" style={{ marginRight: 6 }} />
              <Text style={styles.noticeText}>
                Solo los compradores verificados pueden calificar este producto.
              </Text>
            </View>
          ) : (
            <View style={styles.noticeBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" style={{ marginRight: 6 }} />
              <Text style={styles.noticeText}>Ya has compartido tu opinión sobre esta prenda.</Text>
            </View>
          )}
        </View>
      )}

      {/* HU-67: LISTADO DE RESEÑAS */}
      <View style={styles.reviewsList}>
        {resenas.length === 0 ? (
          <Text style={styles.emptyReviewsText}>
            Aún no hay opiniones para este producto. ¡Sé el primero en comprarlo y calificarlo!
          </Text>
        ) : (
          resenas.map((resena) => {
            const esMiResena = user?.id === resena.usuarioId;
            const inicial = resena.usuario?.nombre?.charAt(0).toUpperCase() || 'U';

            return (
              <View key={resena.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{inicial}</Text>
                    </View>
                    <View>
                      <View style={styles.nameRow}>
                        <Text style={styles.userName}>
                          {resena.usuario?.nombre} {resena.usuario?.apellido?.charAt(0)}.
                        </Text>
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                          <Text style={styles.verifiedText}>Comprador verificado</Text>
                        </View>
                      </View>
                      {renderEstrellas(resena.calificacion, 13)}
                    </View>
                  </View>

                  {/* HU-68: Eliminar mi propia reseña */}
                  {esMiResena && (
                    <TouchableOpacity
                      onPress={() => handleEliminarMiResena(resena.id)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.commentText}>{resena.comentario}</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  loaderBox: { padding: 20, alignItems: 'center' },
  title: { fontSize: 13, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 16,
  },
  scoreBox: { alignItems: 'center', width: 90 },
  bigScore: { fontSize: 32, fontWeight: '800', color: '#111827', lineHeight: 36 },
  starsContainer: { flexDirection: 'row', marginTop: 4 },
  totalText: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  barsContainer: { flex: 1, gap: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 10, color: '#6b7280', width: 18, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 3 },
  barCount: { fontSize: 10, color: '#9ca3af', width: 18 },
  actionSection: { marginBottom: 16 },
  openFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  openFormBtnText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  formContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: '#374151', marginBottom: 8 },
  ratingPicker: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  starPickerBtn: { padding: 4 },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    minHeight: 80,
    marginBottom: 12,
  },
  formButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  cancelBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  submitBtn: { backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 6 },
  submitBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderRadius: 8,
  },
  noticeText: { fontSize: 12, color: '#4b5563', flex: 1 },
  reviewsList: { gap: 12 },
  emptyReviewsText: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    gap: 3,
  },
  verifiedText: { fontSize: 9, color: '#16a34a', fontWeight: '700' },
  deleteBtn: { padding: 4 },
  commentText: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
});
