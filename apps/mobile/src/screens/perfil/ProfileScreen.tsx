import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { perfilApi, DireccionEnvio } from '../../services/perfil.api';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout, refreshToken, setUser } = useAuthStore();

  // Direcciones (HU-12, HU-13, HU-14)
  const [direcciones, setDirecciones] = useState<DireccionEnvio[]>([]);
  const [cargandoDirecciones, setCargandoDirecciones] = useState(false);

  // Modales
  const [modalEditarPerfil, setModalEditarPerfil] = useState(false);
  const [modalCambiarPassword, setModalCambiarPassword] = useState(false);
  const [modalNuevaDireccion, setModalNuevaDireccion] = useState(false);

  // Estados de formulario de edición (HU-10)
  const [formNombre, setFormNombre] = useState('');
  const [formApellido, setFormApellido] = useState('');
  const [formCelular, setFormCelular] = useState('');
  const [formFoto, setFormFoto] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  // Estados de cambio de contraseña (HU-11)
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  // Estados de nueva dirección (HU-12)
  const [dirCalle, setDirCalle] = useState('');
  const [dirCiudad, setDirCiudad] = useState('');
  const [dirDepartamento, setDirDepartamento] = useState('');
  const [dirReferencia, setDirReferencia] = useState('');
  const [dirPredeterminada, setDirPredeterminada] = useState(false);
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  // Cargar direcciones del usuario
  const fetchDirecciones = useCallback(async () => {
    if (!user) return;
    setCargandoDirecciones(true);
    try {
      const data = await perfilApi.obtenerDirecciones(user.id);
      setDirecciones(data);
    } catch (err) {
      console.error('Error cargando direcciones:', err);
    } finally {
      setCargandoDirecciones(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDirecciones();
    }
  }, [user, fetchDirecciones]);

  const handleOpenEditarPerfil = () => {
    if (!user) return;
    setFormNombre(user.nombre || '');
    setFormApellido(user.apellido || '');
    setFormCelular(user.celular || '');
    setFormFoto(user.foto || '');
    setModalEditarPerfil(true);
  };

  const handleGuardarPerfil = async () => {
    if (!user) return;
    if (!formNombre.trim()) {
      Alert.alert('Campo obligatorio', 'El nombre no puede estar vacío.');
      return;
    }

    setGuardandoPerfil(true);
    try {
      const datosActualizados = await perfilApi.actualizarPerfil(user.id, {
        nombre: formNombre.trim(),
        apellido: formApellido.trim(),
        celular: formCelular.trim(),
        foto: formFoto.trim() || undefined,
      });

      setUser({
        ...user,
        nombre: datosActualizados.nombre || formNombre,
        apellido: datosActualizados.apellido || formApellido,
        celular: datosActualizados.celular || formCelular,
        foto: datosActualizados.foto || formFoto,
      });

      setModalEditarPerfil(false);
      Alert.alert('Perfil actualizado', 'Tus datos se han guardado correctamente.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No se pudo actualizar el perfil.';
      Alert.alert('Error', msg);
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const handleCambiarPassword = async () => {
    if (!user) return;
    if (!passwordActual || !nuevoPassword) {
      Alert.alert('Campos requeridos', 'Por favor completa las contraseñas.');
      return;
    }
    if (nuevoPassword.length < 6) {
      Alert.alert('Contraseña corta', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (nuevoPassword !== confirmarPassword) {
      Alert.alert('No coinciden', 'La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setGuardandoPassword(true);
    try {
      await perfilApi.cambiarPassword(user.id, passwordActual, nuevoPassword);
      setModalCambiarPassword(false);
      setPasswordActual('');
      setNuevoPassword('');
      setConfirmarPassword('');
      Alert.alert('Éxito', 'Tu contraseña se ha cambiado correctamente.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al cambiar la contraseña.';
      Alert.alert('Error', msg);
    } finally {
      setGuardandoPassword(false);
    }
  };

  const handleCrearDireccion = async () => {
    if (!user) return;
    if (!dirCalle.trim() || !dirCiudad.trim() || !dirDepartamento.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa dirección, ciudad y departamento.');
      return;
    }

    setGuardandoDireccion(true);
    try {
      await perfilApi.crearDireccion(user.id, {
        direccion: dirCalle.trim(),
        ciudad: dirCiudad.trim(),
        departamento: dirDepartamento.trim(),
        referencia: dirReferencia.trim() || undefined,
        esPredeterminada: dirPredeterminada,
      });

      setModalNuevaDireccion(false);
      setDirCalle('');
      setDirCiudad('');
      setDirDepartamento('');
      setDirReferencia('');
      setDirPredeterminada(false);

      await fetchDirecciones();
      Alert.alert('Éxito', 'Dirección agregada correctamente.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'No se pudo agregar la dirección.';
      Alert.alert('Error', msg);
    } finally {
      setGuardandoDireccion(false);
    }
  };

  const handleEliminarDireccion = (id: string, nombreDir: string) => {
    Alert.alert(
      'Eliminar Dirección',
      `¿Deseas eliminar "${nombreDir}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await perfilApi.eliminarDireccion(id);
              await fetchDirecciones();
            } catch (err) {
              Alert.alert('Error', 'No se pudo eliminar la dirección.');
            }
          },
        },
      ],
    );
  };

  const handleMarcarPredeterminada = async (id: string) => {
    if (!user) return;
    try {
      await perfilApi.marcarPredeterminada(id, user.id);
      await fetchDirecciones();
    } catch (err) {
      Alert.alert('Error', 'No se pudo actualizar la dirección predeterminada.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            if (refreshToken) {
              await authService.logout(refreshToken);
            }
          } catch {
            // Ignorar error de red y proceder
          } finally {
            logout();
          }
        },
      },
    ]);
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person-outline" size={42} color="#9ca3af" />
        </View>
        <Text style={styles.title}>No has iniciado sesión</Text>
        <Text style={styles.description}>
          Accede a tu cuenta para ver tus pedidos, favoritos, direcciones y datos personales.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
        >
          <Text style={styles.primaryButtonText}>Iniciar Sesión / Registrarse</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inicial = user.nombre?.charAt(0).toUpperCase() || 'U';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* CABECERA DE PERFIL (HU-09 & HU-82) */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          {user.foto ? (
            <Image source={{ uri: user.foto }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarLetter}>{inicial}</Text>
          )}
        </View>

        <Text style={styles.userName}>
          {user.nombre} {user.apellido}
        </Text>
        <Text style={styles.userEmail}>{user.correo}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.roleBadge]}>
            <Text style={styles.roleBadgeText}>{user.rol || 'CLIENTE'}</Text>
          </View>
          <View
            style={[
              styles.badge,
              user.emailVerificado ? styles.verifiedBadge : styles.unverifiedBadge,
            ]}
          >
            <Ionicons
              name={user.emailVerificado ? 'checkmark-circle' : 'time-outline'}
              size={12}
              color={user.emailVerificado ? '#16a34a' : '#d97706'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.badgeText,
                user.emailVerificado ? styles.verifiedText : styles.unverifiedText,
              ]}
            >
              {user.emailVerificado ? 'Email Verificado' : 'Email Pendiente'}
            </Text>
          </View>
        </View>

        {/* BOTONES DE EDICIÓN Y SEGURIDAD */}
        <View style={styles.profileActionsRow}>
          <TouchableOpacity style={styles.editProfileBtn} onPress={handleOpenEditarPerfil}>
            <Ionicons name="create-outline" size={15} color="#111827" style={{ marginRight: 6 }} />
            <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changePasswordBtn}
            onPress={() => setModalCambiarPassword(true)}
          >
            <Ionicons name="key-outline" size={15} color="#4b5563" style={{ marginRight: 6 }} />
            <Text style={styles.changePasswordBtnText}>Contraseña</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ACCESOS DIRECTOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => navigation.navigate('Favoritos')}
          >
            <View style={styles.iconLabelRow}>
              <Ionicons name="heart-outline" size={18} color="#ef4444" style={{ marginRight: 10 }} />
              <Text style={styles.infoLabelBold}>Mis Favoritos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconLabelRow}>
              <Ionicons name="call-outline" size={18} color="#6b7280" style={{ marginRight: 10 }} />
              <Text style={styles.infoLabel}>Teléfono / Celular</Text>
            </View>
            <Text style={styles.infoValue}>{user.celular || 'No registrado'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconLabelRow}>
              <Ionicons name="card-outline" size={18} color="#6b7280" style={{ marginRight: 10 }} />
              <Text style={styles.infoLabel}>Cédula de Identidad</Text>
            </View>
            <Text style={styles.infoValue}>{user.ci || 'No registrado'}</Text>
          </View>
        </View>
      </View>

      {/* DIRECCIONES DE ENVÍO (HU-12, HU-13, HU-14) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Direcciones de Envío</Text>
          <TouchableOpacity
            style={styles.addAddressBtn}
            onPress={() => setModalNuevaDireccion(true)}
          >
            <Ionicons name="add" size={16} color="#111827" />
            <Text style={styles.addAddressBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {cargandoDirecciones ? (
          <ActivityIndicator size="small" color="#000" style={{ marginVertical: 12 }} />
        ) : direcciones.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="location-outline" size={28} color="#9ca3af" />
            <Text style={styles.emptyCardText}>No tienes direcciones de envío guardadas.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {direcciones.map((dir) => (
              <View key={dir.id} style={styles.addressCard}>
                <View style={styles.addressMain}>
                  <View style={styles.addressTitleRow}>
                    <Text style={styles.addressText}>{dir.direccion}</Text>
                    {dir.esPredeterminada && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Predeterminada</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressSubtext}>
                    {dir.ciudad}, {dir.departamento} {dir.codigoPostal ? `(${dir.codigoPostal})` : ''}
                  </Text>
                  {dir.referencia ? (
                    <Text style={styles.addressRef}>Ref: {dir.referencia}</Text>
                  ) : null}
                </View>

                <View style={styles.addressActions}>
                  {!dir.esPredeterminada && (
                    <TouchableOpacity
                      style={styles.setDefaultBtn}
                      onPress={() => handleMarcarPredeterminada(dir.id)}
                    >
                      <Ionicons name="star-outline" size={14} color="#6b7280" />
                      <Text style={styles.setDefaultText}>Hacer predeterminada</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleEliminarDireccion(dir.id, dir.direccion)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* CERRAR SESIÓN */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: EDITAR PERFIL (HU-10) */}
      <Modal visible={modalEditarPerfil} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Mi Perfil</Text>
              <TouchableOpacity onPress={() => setModalEditarPerfil(false)}>
                <Ionicons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput style={styles.input} value={formNombre} onChangeText={setFormNombre} />

            <Text style={styles.inputLabel}>Apellido</Text>
            <TextInput style={styles.input} value={formApellido} onChangeText={setFormApellido} />

            <Text style={styles.inputLabel}>Teléfono / Celular</Text>
            <TextInput
              style={styles.input}
              value={formCelular}
              onChangeText={setFormCelular}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>URL Foto de Perfil (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#9ca3af"
              value={formFoto}
              onChangeText={setFormFoto}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalEditarPerfil(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                disabled={guardandoPerfil}
                onPress={handleGuardarPerfil}
              >
                {guardandoPerfil ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CAMBIAR CONTRASEÑA (HU-11) */}
      <Modal visible={modalCambiarPassword} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setModalCambiarPassword(false)}>
                <Ionicons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Contraseña Actual</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={passwordActual}
              onChangeText={setPasswordActual}
            />

            <Text style={styles.inputLabel}>Nueva Contraseña</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#9ca3af"
              value={nuevoPassword}
              onChangeText={setNuevoPassword}
            />

            <Text style={styles.inputLabel}>Confirmar Nueva Contraseña</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmarPassword}
              onChangeText={setConfirmarPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalCambiarPassword(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                disabled={guardandoPassword}
                onPress={handleCambiarPassword}
              >
                {guardandoPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Actualizar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: NUEVA DIRECCIÓN (HU-12) */}
      <Modal visible={modalNuevaDireccion} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Dirección de Envío</Text>
              <TouchableOpacity onPress={() => setModalNuevaDireccion(false)}>
                <Ionicons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Dirección / Calle</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Av. Principal #123"
              value={dirCalle}
              onChangeText={setDirCalle}
            />

            <Text style={styles.inputLabel}>Ciudad</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Santa Cruz"
              value={dirCiudad}
              onChangeText={setDirCiudad}
            />

            <Text style={styles.inputLabel}>Departamento / Estado</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Santa Cruz"
              value={dirDepartamento}
              onChangeText={setDirDepartamento}
            />

            <Text style={styles.inputLabel}>Referencia (Opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Frente a la plaza"
              value={dirReferencia}
              onChangeText={setDirReferencia}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setDirPredeterminada(!dirPredeterminada)}
            >
              <Ionicons
                name={dirPredeterminada ? 'checkbox' : 'square-outline'}
                size={20}
                color={dirPredeterminada ? '#111827' : '#9ca3af'}
              />
              <Text style={styles.checkboxText}>Establecer como dirección predeterminada</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalNuevaDireccion(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                disabled={guardandoDireccion}
                onPress={handleCrearDireccion}
              >
                {guardandoDireccion ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar Dirección</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 30, fontWeight: 'bold', color: '#ffffff' },
  userName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadge: { backgroundColor: '#f3f4f6' },
  roleBadgeText: { fontSize: 10, fontWeight: '700', color: '#374151' },
  verifiedBadge: { backgroundColor: '#f0fdf4' },
  verifiedText: { fontSize: 10, fontWeight: '700', color: '#16a34a' },
  unverifiedBadge: { backgroundColor: '#fffbeb' },
  unverifiedText: { fontSize: 10, fontWeight: '700', color: '#d97706' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  profileActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  editProfileBtnText: { fontSize: 12, fontWeight: '600', color: '#111827' },
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  changePasswordBtnText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  section: { marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addAddressBtnText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center' },
  infoLabelBold: { fontSize: 14, fontWeight: '700', color: '#111827' },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 8,
  },
  emptyCardText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  addressMain: { marginBottom: 8 },
  addressTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  addressText: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  defaultBadge: { backgroundColor: '#111827', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  addressSubtext: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  addressRef: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 2 },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  setDefaultBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  setDefaultText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutButtonText: { color: '#dc2626', fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  checkboxText: { fontSize: 12, color: '#4b5563' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  modalSaveBtn: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalSaveText: { fontSize: 13, color: '#fff', fontWeight: '700' },
});
