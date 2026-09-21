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

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();

  const [token, setToken] = useState(route.params?.token || '');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token.trim()) {
      Alert.alert('Código requerido', 'Por favor ingresa el token o código que recibiste por correo.');
      return;
    }

    if (nuevaContrasena.length < 6) {
      Alert.alert('Contraseña muy corta', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      Alert.alert('No coinciden', 'Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.restablecerPassword(token.trim(), nuevaContrasena);
      Alert.alert(
        '¡Contraseña Actualizada!',
        res.message || 'Tu contraseña ha sido restablecida. Inicia sesión con tu nueva contraseña.',
        [
          {
            text: 'Iniciar Sesión',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Error al restablecer la contraseña. El código puede haber expirado.';
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Nueva Contraseña</Text>
        <Text style={styles.subtitle}>Ingresa el código que recibiste y tu nueva contraseña</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Código / Token de Seguridad</Text>
        <Input
          placeholder="Código recibido por correo"
          value={token}
          onChangeText={setToken}
        />

        <Text style={styles.label}>Nueva Contraseña (Mínimo 6 caracteres)</Text>
        <Input
          placeholder="••••••••"
          secureTextEntry
          value={nuevaContrasena}
          onChangeText={setNuevaContrasena}
        />

        <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
        <Input
          placeholder="••••••••"
          secureTextEntry
          value={confirmarContrasena}
          onChangeText={setConfirmarContrasena}
        />

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <Button title="Actualizar Contraseña" onPress={handleReset} />
          )}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.backText}>← Volver al Inicio de Sesión</Text>
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
    marginBottom: 28,
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
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: 24,
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
