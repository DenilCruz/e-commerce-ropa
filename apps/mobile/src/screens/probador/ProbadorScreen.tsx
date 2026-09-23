import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { probadorApi, ModeloBase, ProbarPrendaResponse } from '../../services/probador.api';
import { catalogoApi, Producto } from '../../services/catalogo.api';
import { api, getImageUrl } from '../../services/api';

export const ProbadorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const productoInicial = route.params?.producto as Producto | undefined;

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(productoInicial || null);
  const [modelosBase, setModelosBase] = useState<ModeloBase[]>([]);
  const [modeloSeleccionado, setModeloSeleccionado] = useState<ModeloBase | null>(null);

  const [fotoPersonaUrl, setFotoPersonaUrl] = useState<string>('');
  const [mostrarUrlInput, setMostrarUrlInput] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [cargandoCatalog, setCargandoCatalog] = useState(false);
  const [resultado, setResultado] = useState<ProbarPrendaResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Cargar modelos base de avatares de estudio
    probadorApi
      .obtenerModelosBase()
      .then((data) => {
        setModelosBase(data);
        if (data.length > 0) {
          setModeloSeleccionado(data[0]);
        }
      })
      .catch((err) => console.log('Error cargando modelos base:', err));

    // Cargar productos del catálogo si no hay producto preseleccionado
    if (!productoInicial) {
      setCargandoCatalog(true);
      catalogoApi
        .obtenerProductos()
        .then((prods) => {
          setProductos(prods);
          if (prods.length > 0) {
            setProductoSeleccionado(prods[0]);
          }
        })
        .catch(() => {})
        .finally(() => setCargandoCatalog(false));
    }
  }, [productoInicial]);

  // Handler para tomar foto con la Cámara del dispositivo
  const handleTomarFoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Se necesita acceso a la cámara para tomar tu foto.'
        );
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.6,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const imageSource = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setFotoPersonaUrl(imageSource);
        setModeloSeleccionado(null);
      }
    } catch (err: any) {
      Alert.alert('Error Cámara', err?.message || 'No se pudo abrir la cámara.');
    }
  };

  // Handler para seleccionar foto desde la Galería
  const handleSeleccionarGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Se necesita permiso de acceso a la galería para seleccionar una foto.'
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.6,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const imageSource = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setFotoPersonaUrl(imageSource);
        setModeloSeleccionado(null);
      }
    } catch (err: any) {
      Alert.alert('Error Galería', err?.message || 'No se pudo abrir la galería.');
    }
  };

  const handleProbarPrenda = async () => {
    if (!productoSeleccionado) {
      Alert.alert('Prenda requerida', 'Por favor selecciona una prenda para probar.');
      return;
    }

    const imgPrenda = productoSeleccionado.imagenes?.[0]?.url;
    if (!imgPrenda) {
      Alert.alert('Sin imagen', 'La prenda seleccionada no posee foto principal.');
      return;
    }

    const fotoFinalPersona = fotoPersonaUrl.trim() || (modeloSeleccionado ? getImageUrl(modeloSeleccionado.fotoUrl) : '');
    if (!fotoFinalPersona) {
      Alert.alert('Foto requerida', 'Toma una foto, selecciona una de la galería o escoge un avatar de estudio.');
      return;
    }

    setProcesando(true);
    setErrorMsg(null);
    setResultado(null);

    const catNombre = productoSeleccionado.categoria?.nombre?.toLowerCase() || '';
    const categoria: 'tops' | 'bottoms' | 'dresses' = catNombre.includes('vestido')
      ? 'dresses'
      : catNombre.includes('pantalon') || catNombre.includes('falda') || catNombre.includes('short')
      ? 'bottoms'
      : 'tops';

    try {
      const res = await probadorApi.probarPrenda({
        fotoPersona: fotoFinalPersona,
        fotoPrenda: getImageUrl(imgPrenda),
        nombrePrenda: productoSeleccionado.nombre,
        categoria,
      });

      setResultado(res);
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setErrorMsg('El servidor de IA demoró más de lo esperado en la cola. Por favor reintenta en unos instantes.');
      } else if (err.message === 'Network Error') {
        setErrorMsg('Error de red. Verifica que tengas conexión a internet o reintenta.');
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Error al procesar la prueba virtual IA.');
      }
    } finally {
      setProcesando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Probador Virtual IA</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* BANNER IA */}
        <View style={styles.banner}>
          <Ionicons name="sparkles" size={20} color="#f59e0b" />
          <Text style={styles.bannerText}>
            Simulación de ajuste, caído y proporciones con Inteligencia Artificial IDM-VTON.
          </Text>
        </View>

        {/* 1. SELECCIÓN DE PRENDA */}
        <Text style={styles.sectionTitle}>1. Prenda a Probar</Text>
        {productoSeleccionado ? (
          <View style={styles.selectedGarmentCard}>
            <Image
              source={{ uri: getImageUrl(productoSeleccionado.imagenes?.[0]?.url) }}
              style={styles.garmentImage}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.garmentCategory}>
                {productoSeleccionado.categoria?.nombre || 'Colección Atelier'}
              </Text>
              <Text style={styles.garmentName}>{productoSeleccionado.nombre}</Text>
              <Text style={styles.garmentPrice}>
                ${Number(productoSeleccionado.precio).toFixed(2)} USD
              </Text>
            </View>

            {!productoInicial && (
              <TouchableOpacity
                style={styles.changeGarmentBtn}
                onPress={() => setProductoSeleccionado(null)}
              >
                <Text style={styles.changeGarmentText}>Cambiar</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : cargandoCatalog ? (
          <ActivityIndicator size="small" color="#000" style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.garmentList}>
            {productos.map((prod) => (
              <TouchableOpacity
                key={prod.id}
                style={styles.garmentItem}
                onPress={() => setProductoSeleccionado(prod)}
              >
                <Image
                  source={{ uri: getImageUrl(prod.imagenes?.[0]?.url) }}
                  style={styles.garmentItemImg}
                />
                <Text numberOfLines={1} style={styles.garmentItemName}>{prod.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 2. AVATAR DE ESTUDIO O FOTO */}
        <Text style={styles.sectionTitle}>2. Tu Foto para la Prueba Virtual</Text>

        {/* BOTONES CÁMARA Y GALERÍA */}
        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.photoActionBtn} onPress={handleTomarFoto}>
            <View style={styles.photoActionIconBg}>
              <Ionicons name="camera" size={22} color="#0f172a" />
            </View>
            <Text style={styles.photoActionText}>Tomar Foto</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.photoActionBtn} onPress={handleSeleccionarGaleria}>
            <View style={styles.photoActionIconBg}>
              <Ionicons name="images" size={22} color="#0f172a" />
            </View>
            <Text style={styles.photoActionText}>Subir de Galería</Text>
          </TouchableOpacity>
        </View>

        {/* FOTO SELECCIONADA POR EL USUARIO */}
        {fotoPersonaUrl ? (
          <View style={styles.customPhotoCard}>
            <Image source={{ uri: fotoPersonaUrl }} style={styles.customPhotoPreview} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.customPhotoBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.customPhotoBadgeText}>Foto Personal Cargada</Text>
              </View>
              <Text style={styles.customPhotoSubtext}>Lista para probar la prenda con IA</Text>
            </View>
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => setFotoPersonaUrl('')}
            >
              <Ionicons name="close-circle" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* AVATARES PREDETERMINADOS */}
        <Text style={styles.subTitle}>O elige un avatar de estudio predeterminado:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarsRow}>
          {modelosBase.map((mod) => {
            const isSelected = modeloSeleccionado?.id === mod.id && !fotoPersonaUrl;
            return (
              <TouchableOpacity
                key={mod.id}
                style={[styles.avatarCard, isSelected && styles.avatarCardSelected]}
                onPress={() => {
                  setModeloSeleccionado(mod);
                  setFotoPersonaUrl('');
                }}
              >
                <Image source={{ uri: getImageUrl(mod.fotoUrl) }} style={styles.avatarImg} />
                <Text numberOfLines={1} style={styles.avatarName}>{mod.nombre}</Text>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#4f46e5" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* OPCIONAL: ENLACE URL */}
        <TouchableOpacity
          style={styles.toggleUrlBtn}
          onPress={() => setMostrarUrlInput(!mostrarUrlInput)}
        >
          <Text style={styles.toggleUrlText}>
            {mostrarUrlInput ? 'Ocultar opción de enlace URL' : '— O ingresa un enlace URL de foto —'}
          </Text>
        </TouchableOpacity>

        {mostrarUrlInput && (
          <TextInput
            style={styles.inputUrl}
            placeholder="https://ejemplo.com/mi-foto.jpg"
            placeholderTextColor="#9ca3af"
            value={fotoPersonaUrl}
            onChangeText={(val) => {
              setFotoPersonaUrl(val);
              if (val) setModeloSeleccionado(null);
            }}
          />
        )}

        {/* BOTÓN PROCESAR */}
        <TouchableOpacity
          style={[styles.actionBtn, procesando && { opacity: 0.7 }]}
          onPress={handleProbarPrenda}
          disabled={procesando}
        >
          {procesando ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.actionBtnText}>
            {procesando ? 'Conectando con IA... (~30s)' : 'Iniciar Prueba Virtual'}
          </Text>
        </TouchableOpacity>

        {procesando && (
          <View style={[styles.banner, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', marginTop: 12 }]}>
            <Ionicons name="time-outline" size={18} color="#16a34a" />
            <Text style={[styles.bannerText, { color: '#166534' }]}>
              Generando difusión neuronal en Hugging Face (IDM-VTON). Esto toma entre 30 y 40 segundos, por favor mantén la app abierta.
            </Text>
          </View>
        )}

        {/* ERRORES */}
        {errorMsg && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* 3. RESULTADO DE PRUEBA */}
        {resultado && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>✨ Resultado de la Prueba Virtual</Text>
            <View style={styles.resultImageWrapper}>
              <Image
                source={{ uri: getImageUrl(resultado.imagenResultadoUrl) }}
                style={styles.resultImg}
                contentFit="contain"
              />
            </View>
            <Text style={styles.resultFooter}>
              Procesado en {resultado.tiempoProcesamientoSegundos || 2} segundos con IA.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bannerText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  selectedGarmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  garmentImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
  garmentCategory: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  garmentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  garmentPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  changeGarmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  changeGarmentText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  garmentList: {
    marginBottom: 20,
  },
  garmentItem: {
    width: 90,
    marginRight: 10,
  },
  garmentItemImg: {
    width: 90,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  garmentItemName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
  },
  avatarsRow: {
    marginBottom: 16,
  },
  avatarCard: {
    width: 100,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    position: 'relative',
  },
  avatarCardSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  avatarImg: {
    width: 84,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  avatarName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 6,
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  toggleUrlBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 4,
  },
  toggleUrlText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  inputUrl: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 20,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  photoActionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  customPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
  },
  customPhotoPreview: {
    width: 50,
    height: 66,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  customPhotoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customPhotoBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
    marginLeft: 4,
  },
  customPhotoSubtext: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  removePhotoBtn: {
    padding: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    flex: 1,
  },
  resultContainer: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  resultImageWrapper: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  resultImg: {
    width: '100%',
    height: '100%',
  },
  resultFooter: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 10,
  },
});

