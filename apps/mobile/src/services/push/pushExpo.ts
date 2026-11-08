import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api';
import { AdaptadorPush, AlmacenToken, DependenciasPush, ServidorPush } from './registroPush';

const CLAVE = '@aura_push_token';
const CANAL = 'default';

/** Shows notifications that arrive while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const adaptadorExpo: AdaptadorPush = {
  esDispositivoFisico: () => Device.isDevice,
  projectId: () => {
    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  },
  obtenerPermiso: async () => (await Notifications.getPermissionsAsync()).status,
  pedirPermiso: async () => (await Notifications.requestPermissionsAsync()).status,
  prepararCanal: async () => {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Avisos de la tienda',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  },
  obtenerToken: async (projectId) => (await Notifications.getExpoPushTokenAsync({ projectId })).data,
};

const almacenAsync: AlmacenToken = {
  leer: () => AsyncStorage.getItem(CLAVE),
  guardar: (valor) => AsyncStorage.setItem(CLAVE, valor),
  borrar: () => AsyncStorage.removeItem(CLAVE),
};

const servidorApi: ServidorPush = {
  registrar: async (token) => {
    await api.post('/push/expo', { token });
  },
  baja: async (token) => {
    await api.post('/push/expo/baja', { token });
  },
};

/** The real dependencies: expo-notifications + expo-device, AsyncStorage and the API. */
export const dependenciasPush: DependenciasPush = { adaptador: adaptadorExpo, almacen: almacenAsync, servidor: servidorApi };

export { Notifications };
