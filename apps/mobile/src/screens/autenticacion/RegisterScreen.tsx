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

type NavProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [celular, setCelular] = useState('');
  const [ci, setCi] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!nombre.trim() || !apellido.trim() || !correo.trim() || !contrasena.trim()) {
      Alert.alert('Campos requeridos', 'Por favor llena tu nombre, apellido, correo y contraseña.');
      return;
    }

    if (contrasena.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.registro({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim(),
        contrasena,
        celular: celular.trim() || undefined,
        ci: ci.trim() || undefined,
      });

      Alert.alert(
        '¡Registro Exitoso!',
        res.message || 'Se ha enviado un correo con el enlace de verificación para activar tu cuenta.',
        [
          {
            text: 'Verificar Correo',
            onPress: () => navigation.navigate('VerifyEmail'),
          },
          {
            text: 'Iniciar Sesión',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Error al completar el registro. Inténtalo de nuevo.';
      Alert.alert('Error de Registro', Array.isArray(msg) ? msg.join('\n') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Crear Cuenta</Text>
        <Text style={styles.subtitle}>Únete a AURA y descubre el lujo silencioso</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre</Text>
        <Input
          placeholder="Juan"
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={styles.label}>Apellido</Text>
        <Input
          placeholder="Pérez"
          value={apellido}
          onChangeText={setApellido}
        />

        <Text style={styles.label}>Correo Electrónico</Text>
        <Input
          placeholder="juan.perez@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={correo}
          onChangeText={setCorreo}
        />

        <Text style={styles.label}>Contraseña (Mínimo 6 caracteres)</Text>
        <Input
          placeholder="••••••••"
          secureTextEntry
          value={contrasena}
          onChangeText={setContrasena}
        />

        <Text style={styles.label}>Celular (Opcional)</Text>
        <Input
          placeholder="77123456"
          keyboardType="phone-pad"
          value={celular}
          onChangeText={setCelular}
        />

        <Text style={styles.label}>CI (Opcional)</Text>
        <Input
          placeholder="12345678"
          value={ci}
          onChangeText={setCi}
        />

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <Button title="Crear Cuenta" onPress={handleRegister} />
          )}
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.alreadyText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Inicia Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
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
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  alreadyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
});
