import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  /**
   * Guarda un valor serializado en JSON bajo la clave especificada.
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      const json = JSON.stringify(value);
      await AsyncStorage.setItem(key, json);
    } catch (error) {
      console.error(`[Storage] Error al guardar "${key}":`, error);
    }
  },

  /**
   * Obtiene y deserializa un valor JSON bajo la clave especificada.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const json = await AsyncStorage.getItem(key);
      if (json === null) return null;
      return JSON.parse(json) as T;
    } catch (error) {
      console.error(`[Storage] Error al leer "${key}":`, error);
      return null;
    }
  },

  /**
   * Elimina un ítem por su clave.
   */
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Error al remover "${key}":`, error);
    }
  },

  /**
   * Obtiene todas las claves que coincidan con un prefijo.
   */
  async getKeysByPrefix(prefix: string): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter((k) => k.startsWith(prefix));
    } catch (error) {
      console.error(`[Storage] Error al listar claves con prefijo "${prefix}":`, error);
      return [];
    }
  },

  /**
   * Limpia todo el almacenamiento local.
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[Storage] Error al limpiar almacenamiento:', error);
    }
  },
};
