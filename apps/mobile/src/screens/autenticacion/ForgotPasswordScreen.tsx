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

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendRecovery = async () => {
    if (!correo.trim()) {
      Alert.alert('Correo requerido', 'Por favor ingresa tu correo electrónico registrado.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.recuperarPassword(correo.trim());
      Alert.alert(
        'Solicitud Enviada',
        res.message || 'Si el correo está registrado, recibirás un enlace/token para restablecer tu contraseña.',
        [
          {
            text: 'Ingresar Token de Recuperación',
            onPress: () => navigation.navigate('ResetPassword'),
          },
          {
            text: 'Volver al Login',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al procesar la solicitud.';
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Recuperar Clave</Text>
        <Text style={styles.subtitle}>
          Te enviaremos un código de seguridad para restablecer tu contraseña
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Correo Electrónico Registrado</Text>
        <Input
          placeholder="usuario@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={setCorreo}
        />

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <Button title="Enviar Código de Recuperación" onPress={handleSendRecovery} />
          )}
        </View>

        <TouchableOpacity
          style={styles.hasTokenButton}
          onPress={() => navigation.navigate('ResetPassword')}
        >
          <Text style={styles.hasTokenText}>¿Ya tienes un código? Ingrésalo aquí</Text>
        </TouchableOpacity>

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
    paddingHorizontal: 16,
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
  hasTokenButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 8,
  },
  hasTokenText: {
    fontSize: 13,
    color: '#4f46e5',
    fontWeight: '600',
  },
  backButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
});
