import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, RefreshCw, Feather } from 'lucide-react';
import { obtenerProductos, obtenerCategorias } from '../../catalogo/services/catalogo.api';
import { Producto, Categoria } from '../../catalogo/types';
import { ProductCard } from '../../catalogo/components/ProductCard';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');

const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

// Colección de imágenes editoriales para el Hero dinámico
const HERO_SLIDES = [
  {
    image: `${ASSETS_URL}/uploads/vestido_seda_oliva_1790036699102.jpg`,
    title: 'Edición Seda Morera',
    subtitle: 'Fluidez y caída orgánica que desafían el paso del tiempo.',
    categoryLink: '/catalogo?categoria=264efe79-ded7-4cfa-a0b0-110b822944c5'
  },
  {
    image: `${ASSETS_URL}/uploads/blazer_sastre_camel.jpg`,
    title: 'Sastrería Arquitectónica',
    subtitle: 'Estructura en lana fría con solapas definidas y líneas sobrias.',
    categoryLink: '/catalogo?categoria=afc1e8b6-47ab-45bc-a0d7-02dcd023ff3b'
  },
  {
    image: `${ASSETS_URL}/uploads/falda_plisada_camel_1790037005715.jpg`,
    title: 'Movimiento & Textura',
    subtitle: 'Plisados permanentes que crean volumen y armonía al andar.',
    categoryLink: '/catalogo?categoria=67c0ec1b-94fa-4bd4-b37a-9f74f815031f'
  },
  {
    image: `${ASSETS_URL}/uploads/vestido_lino_blanco_1790036743580.jpg`,
    title: 'Puro Lino Italiano',
    subtitle: 'Frescura atemporal hilada con fibras de cultivo sustentable.',
    categoryLink: '/catalogo?categoria=264efe79-ded7-4cfa-a0b0-110b822944c5'
  }
];

export const HomePage: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  // Rotación automática suave del Hero con CSS
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCargando(true);
        const [prods, cats] = await Promise.all([
          obtenerProductos(),
          obtenerCategorias(),
        ]);
        setProductos(prods);
        setCategorias(cats.filter((c) => c.activa !== false));
      } catch (err) {
        console.error('Error cargando datos de portada:', err);
      } finally {
        setCargando(false);
      }
    };
    fetchData();
  }, []);

  const productosDestacados = productos.filter((p) => p.destacado).slice(0, 4);
  const productosMuestra = productosDestacados.length > 0 ? productosDestacados : productos.slice(0, 4);

  return (
    <div className="space-y-20 -mt-2">
      {/* 1. HERO EDITORIAL DINÁMICO CON TRANSICIÓN CSS NATIVA */}
      <section className="relative overflow-hidden bg-[#EAE3D6] border border-[#E7E1D7] min-h-[560px] md:min-h-[640px] flex items-center">
        {/* Diapositivas de fondo animadas con crossfade CSS */}
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === activeSlide;
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.03] scale-100 transform transition-transform duration-7000 ease-out"
                style={{
                  transform: isActive ? 'scale(1.04)' : 'scale(1.0)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-stone-900/70 via-stone-900/30 to-transparent" />
            </div>
          );
        })}

        {/* Contenido Editorial del Hero */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-12 py-20 text-white space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 text-[11px] uppercase tracking-luxury">
            <Sparkles className="w-3.5 h-3.5 text-[#EAE2D5]" />
            <span>Colección Permanente · Alta Costura</span>
          </div>

          <div className="space-y-3 max-w-xl">
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal leading-[1.1] tracking-wide text-white">
              {HERO_SLIDES[activeSlide].title}
            </h1>
            <p className="font-serif italic text-xl sm:text-2xl text-stone-200 font-light">
              "Elegancia sutil, presencia absoluta."
            </p>
            <p className="text-sm text-stone-300 font-light max-w-md pt-1 leading-relaxed">
              {HERO_SLIDES[activeSlide].subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              to="/catalogo"
              className="px-8 py-3.5 bg-white text-stone-900 text-xs uppercase tracking-luxury hover:bg-[#FAF8F5] transition-all flex items-center gap-2.5 font-medium shadow-lg hover:shadow-xl"
            >
              <span>Descubrir Colección</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/probador"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs uppercase tracking-luxury transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#EAE2D5]" />
              <span>Probador Virtual IA</span>
            </Link>
          </div>

          {/* Indicadores de diapositiva */}
          <div className="flex items-center gap-2 pt-6">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-1 transition-all duration-300 ${
                  i === activeSlide ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Ir a diapositiva ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. BURBUJAS DE CATEGORÍAS (LOOKBOOK STORIES) */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-[11px] uppercase tracking-luxury text-[#9B7B54] font-semibold">
            Siluetas & Cortes
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-normal">
            Explorar por Categoría
          </h2>
        </div>

        <div className="flex items-center justify-start sm:justify-center gap-6 sm:gap-10 overflow-x-auto pb-4 pt-2 no-scrollbar px-2">
          {categorias.map((cat) => {
            return (
              <Link
                key={cat.id}
                to={`/catalogo?categoria=${cat.id}`}
                className="group flex flex-col items-center gap-3 shrink-0"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] border border-[#D5CCC0] group-hover:border-stone-900 transition-all duration-300">
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#EAE2D5]">
                    {cat.imagen ? (
                      <img
                        src={getImageUrl(cat.imagen)}
                        alt={cat.nombre}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif text-lg text-stone-700">
                        {cat.nombre.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
                <span className="font-serif text-xs sm:text-sm text-stone-800 group-hover:text-stone-900 group-hover:underline decoration-[#9B7B54] underline-offset-4 transition-colors">
                  {cat.nombre}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. PIEZAS CLAVE DEL ATELIER (SELECCIÓN DESTACADA) */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E7E1D7] pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-luxury text-[#9B7B54] font-semibold">
              Edición de Autor
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 font-normal">
              Piezas Clave del Atelier
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="text-xs uppercase tracking-luxury text-stone-800 hover:text-[#9B7B54] flex items-center gap-1.5 font-medium"
          >
            <span>Ver Catálogo Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {cargando ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="aspect-[3/4] bg-[#EAE2D5] rounded-xs" />
                <div className="h-4 bg-[#EAE2D5] w-3/4" />
                <div className="h-4 bg-[#EAE2D5] w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {productosMuestra.map((producto) => (
              <ProductCard key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>

      {/* 4. BANNER PROBADOR VIRTUAL IA — EXPERIENCIA VESTIDOR */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#211F1D] to-[#121110] text-white p-8 sm:p-12 border border-stone-800 shadow-xl">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#9B7B54]/20 border border-[#9B7B54]/40 text-[#EAE2D5] text-[10px] uppercase tracking-luxury">
              <Sparkles className="w-3 h-3 text-[#EAE2D5]" />
              <span>Tecnología de Simulación Textil</span>
            </div>
            <h3 className="font-serif text-3xl sm:text-4xl font-normal leading-tight">
              Prueba la Colección en tu Propia Silueta
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
              Nuestro Probador Virtual con Inteligencia Artificial adapta la caída y proporciones de cada pieza a tu fotografía o avatar seleccionado antes de ordenar.
            </p>
            <div className="pt-2">
              <Link
                to="/probador"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#FAF8F5] text-stone-900 text-xs uppercase tracking-luxury hover:bg-white transition-all font-medium"
              >
                <span>Acceder al Probador Virtual</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="w-full md:w-64 aspect-[3/4] rounded-sm overflow-hidden border border-stone-700 bg-stone-800 shadow-2xl relative">
            <img
              src={`${ASSETS_URL}/uploads/vestido_lencero_champan_1790036811982.jpg`}
              alt="Probador Virtual de Alta Costura"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
              <span className="text-[11px] uppercase tracking-wider text-stone-200">
                Ajuste en Tiempo Real
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PILARES DEL ATELIER AURA */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-t border-b border-[#E7E1D7]">
        <div className="text-center space-y-2 px-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#F2ECE1] flex items-center justify-center text-stone-800">
            <Feather className="w-5 h-5" />
          </div>
          <h4 className="font-serif text-base text-stone-900">Materias Primas Nobles</h4>
          <p className="text-xs text-stone-600 font-light leading-relaxed">
            Seda morera pura, lino italiano transpirable, lana merino virgen y algodón Pima peruano de fibra extralarga.
          </p>
        </div>

        <div className="text-center space-y-2 px-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#F2ECE1] flex items-center justify-center text-stone-800">
            <Shield className="w-5 h-5" />
          </div>
          <h4 className="font-serif text-base text-stone-900">Sastrería de Precisión</h4>
          <p className="text-xs text-stone-600 font-light leading-relaxed">
            Cortes arquitectónicos, acabados a mano y costuras francesas concebidas para un porte impecable.
          </p>
        </div>

        <div className="text-center space-y-2 px-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#F2ECE1] flex items-center justify-center text-stone-800">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h4 className="font-serif text-base text-stone-900">Empaque Atelier Asegurado</h4>
          <p className="text-xs text-stone-600 font-light leading-relaxed">
            Cada envío se protege en cajas rígidas con papel de seda libre de ácido y bolsa guardapolvo de algodón.
          </p>
        </div>
      </section>
    </div>
  );
};
