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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
type ScreenRouteProp = RouteProp<AuthStackParamList, 'VerifyEmail'>;

export const VerifyEmailScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { user, setUser } = useAuthStore();

  const [token, setToken] = useState(route.params?.token || '');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!token.trim()) {
      Alert.alert('Código requerido', 'Por favor ingresa el token de verificación que recibiste por correo.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verificarEmail(token.trim());
      if (user) {
        setUser({ ...user, emailVerificado: true });
      }

      Alert.alert(
        '¡Cuenta Verificada!',
        res.message || 'Tu correo electrónico ha sido verificado con éxito.',
        [
          {
            text: 'Ir a Iniciar Sesión',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Error al verificar el correo. El código puede haber expirado.';
      Alert.alert('Error de Verificación', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Verificar Correo</Text>
        <Text style={styles.subtitle}>
          Ingresa el código que te enviamos para activar todas las funciones de tu cuenta
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Código de Verificación</Text>
        <Input
          placeholder="Código recibido por correo"
          value={token}
          onChangeText={setToken}
        />

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <Button title="Activar Mi Cuenta" onPress={handleVerify} />
          )}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backText}>← Volver a Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 12,
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
  buttonContainer: {
    marginTop: 20,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
});
