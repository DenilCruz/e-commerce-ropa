import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!correo.trim() || !contrasena.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login({
        correo: correo.trim(),
        contrasena,
      });

      setAuth(data.usuario, data.accessToken, data.refreshToken);
      Alert.alert('¡Bienvenido!', `Hola, ${data.usuario.nombre}`);
      // Volver o navegar a la app principal
      navigation.getParent()?.navigate('Main' as never);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Error al iniciar sesión. Verifica tus datos e inténtalo de nuevo.';
      Alert.alert('Error de Autenticación', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.brandTitle}>EL MAGNÍFICO</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Correo Electrónico</Text>
        <Input
          placeholder="ejemplo@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={setCorreo}
        />

        <View style={styles.passwordHeader}>
          <Text style={styles.label}>Contraseña</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>¿Olvidaste tu clave?</Text>
          </TouchableOpacity>
        </View>
        <Input
          placeholder="••••••••"
          secureTextEntry
          value={contrasena}
          onChangeText={setContrasena}
        />

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <Button title="Iniciar Sesión" onPress={handleLogin} />
          )}
        </View>

        <View style={styles.extraLinks}>
          <TouchableOpacity
            style={styles.verifyLink}
            onPress={() => navigation.navigate('VerifyEmail')}
          >
            <Text style={styles.verifyText}>✉️ ¿Tienes un código de verificación?</Text>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.noAccountText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Regístrate aquí</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  forgotText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 24,
  },
  extraLinks: {
    marginTop: 24,
    alignItems: 'center',
  },
  verifyLink: {
    paddingVertical: 8,
  },
  verifyText: {
    fontSize: 13,
    color: '#4f46e5',
    fontWeight: '500',
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  noAccountText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
});
