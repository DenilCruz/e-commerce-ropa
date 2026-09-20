import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { LoginScreen } from '../screens/autenticacion/LoginScreen';
import { RegisterScreen } from '../screens/autenticacion/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/autenticacion/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/autenticacion/ResetPasswordScreen';
import { VerifyEmailScreen } from '../screens/autenticacion/VerifyEmailScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar Sesión', headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear Cuenta' }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Recuperar Contraseña' }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Nueva Contraseña' }} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: 'Verificar Correo' }} />
    </Stack.Navigator>
  );
};
