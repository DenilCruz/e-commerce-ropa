import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout, refreshToken } = useAuthStore();

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
            // Ignorar error de red y proceder con logout local
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
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.title}>No has iniciado sesión</Text>
        <Text style={styles.description}>
          Accede a tu cuenta para ver tus pedidos, direcciones y datos personales.
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {user.nombre?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user.nombre} {user.apellido}</Text>
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
            <Text
              style={[
                styles.badgeText,
                user.emailVerificado ? styles.verifiedText : styles.unverifiedText,
              ]}
            >
              {user.emailVerificado ? '✓ Email Verificado' : '⏳ Email Pendiente'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mi Cuenta</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono / Celular</Text>
            <Text style={styles.infoValue}>{user.celular || 'No registrado'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cédula de Identidad</Text>
            <Text style={styles.infoValue}>{user.ci || 'No registrado'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
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
  avatarText: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
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
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadge: {
    backgroundColor: '#e0e7ff',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  verifiedBadge: {
    backgroundColor: '#dcfce7',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  unverifiedBadge: {
    backgroundColor: '#fef3c7',
  },
  unverifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  badgeText: {
    fontSize: 11,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 6,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '700',
  },
});
