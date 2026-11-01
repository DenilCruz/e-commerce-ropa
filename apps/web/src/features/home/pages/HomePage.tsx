import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Shield, RefreshCw, Feather } from 'lucide-react';
import { obtenerProductos, obtenerCategorias } from '../../catalogo/services/catalogo.api';
import { Producto, Categoria } from '../../catalogo/types';
import { ProductCard } from '../../catalogo/components/ProductCard';
import { useTenantStore } from '../../../hooks/useTenantStore';
import { SpatialHotspot } from '../../../components/spatial/SpatialHotspot';
import { SpatialGlassCard } from '../../../components/spatial/SpatialGlassCard';
import { ImageSequenceCanvas } from '../../../components/spatial/ImageSequenceCanvas';
import './spatial-store-home.css';

const ASSETS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace('/api/v1', '');
const HERO_MODEL = '/images/aura-silk-model.png';
const CATEGORY_PACKSHOTS: Record<string, string> = {
  abrigos: 'coat_camel_clean_packshot.jpg',
  camisas: 'silk_shirt_emerald_packshot.jpg',
  faldas: 'leather_skirt_packshot.jpg',
  pantalones: 'jeans_indigo_packshot.jpg',
  poleras: 'tshirt_moka_packshot.jpg',
  shorts: 'shorts_denim_dark_packshot.jpg',
  vestidos: 'red_dress_packshot.jpg',
};

const getImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${ASSETS_URL}${url}`;
  if (url.startsWith('/')) return `${ASSETS_URL}/uploads${url}`;
  return `${ASSETS_URL}/uploads/${url}`;
};

export const HomePage: React.FC = () => {
  const { getStoreUrl } = useTenantStore();
  const [heroAngle, setHeroAngle] = useState(180);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setCargando(true);
        const [prods, cats] = await Promise.all([obtenerProductos(), obtenerCategorias()]);
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
    <div className="spatial-store-home">
      <section className="spatial-store-home__hero" aria-label="Edición Seda Morera">
        <h1 className="spatial-store-home__headline">
          <span className="spatial-store-home__headline-main">Edición Seda</span>
          {' '}<span className="spatial-store-home__headline-name">Morera</span>
        </h1>
        <div className="spatial-store-home__hero-ambient" />
        <div className="spatial-store-home__model-frame">
          <ImageSequenceCanvas
            images={[HERO_MODEL]}
            alt="Modelo con vestido de seda oliva"
            mode="scroll-scrub"
            controls
            onAngleChange={(angle) => setHeroAngle(Math.round(angle))}
            objectFit="contain"
            className="spatial-store-home__sequence"
          />
        </div>
        <div className="spatial-store-home__orbit" aria-hidden="true" />
        <div className="spatial-store-home__hero-note">
          <p className="spatial-store-home__quote">“Elegancia sutil, presencia absoluta.”</p>
          <p>Fluidez y caída orgánica que desafían el paso del tiempo.</p>
        </div>
        <SpatialHotspot label="Seda morera" detail="Caída fluida y brillo natural." x={61} y={46} angle={heroAngle} className="spatial-store-home__hotspot" />
        <SpatialGlassCard className="spatial-store-home__try-card" strength={1}>
          <span className="spatial-store-home__try-mark"><Sparkles size={15} /></span>
          <div>
            <p>Una nueva perspectiva</p>
            <span>Explora la prenda en el probador</span>
          </div>
          <Link to={getStoreUrl('/probador')} aria-label="Abrir probador virtual"><ArrowRight size={18} /></Link>
        </SpatialGlassCard>
        <Link to={getStoreUrl('/catalogo')} className="spatial-store-home__discover">
          Descubrir la colección <ArrowRight size={15} />
        </Link>
      </section>

      <section className="spatial-store-home__categories" aria-labelledby="store-categories-title">
        <div className="spatial-store-home__section-heading">
          <div><h2 id="store-categories-title">El guardarropa, por forma</h2></div>
          <Link to={getStoreUrl('/catalogo')}>Ver toda la colección <ArrowRight size={15} /></Link>
        </div>
        <div className="spatial-store-home__category-row">
          {categorias.map((cat) => {
            const categoryIds = new Set([cat.id, ...(cat.subcategorias || []).map((subcategory) => subcategory.id)]);
            const representative = productos.find((product) => categoryIds.has(product.categoria?.id || product.categoriaId || '') || product.categoria?.nombre === cat.nombre);
            const packshot = CATEGORY_PACKSHOTS[cat.nombre.trim().toLocaleLowerCase()];
            const productImage = representative?.imagenes?.find((item) => item.esPrincipal || item.principal)?.url || representative?.imagenes?.[0]?.url;
            const image = cat.imagen
              ? getImageUrl(cat.imagen)
              : productImage
                ? getImageUrl(productImage)
                : packshot ? `${ASSETS_URL}/uploads/${packshot}` : '';
            return (
              <Link key={cat.id} to={getStoreUrl(`/catalogo?categoria=${cat.id}`)} className="spatial-store-home__category">
                <div className="spatial-store-home__pedestal">
                  {image ? <img src={image} alt={cat.nombre} loading="lazy" /> : <div className="spatial-store-home__pedestal-empty" aria-hidden="true" />}
                </div>
                <h3>{cat.nombre}</h3>
                <span className="spatial-store-home__category-link">Explorar <ArrowRight size={13} /></span>
              </Link>
            );
          })}
          {categorias.length === 0 && <p className="spatial-store-home__category-empty">Próximamente, nuevas formas para explorar.</p>}
        </div>
      </section>

      <section className="spatial-store-home__pieces">
        <div className="spatial-store-home__section-heading">
          <div><p>Selección del atelier</p><h2>Piezas para quedarse</h2></div>
          <Link to={getStoreUrl('/catalogo')}>Explorar catálogo <ArrowRight size={15} /></Link>
        </div>
        {cargando ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5" aria-label="Cargando prendas">
            {[1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse aspect-[3/4] bg-[#EAE2D5]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {productosMuestra.map((producto) => <ProductCard key={producto.id} producto={producto} />)}
          </div>
        )}
      </section>

      <section className="spatial-store-home__fitting">
        <div className="spatial-store-home__fitting-image" role="img" aria-label="Detalle de una prenda de la colección" />
        <div className="spatial-store-home__fitting-copy">
          <p>Descubre la pieza desde otro ángulo</p>
          <h2>El siguiente paso es imaginarla contigo.</h2>
          <span>Elige una prenda y explora las opciones disponibles en el probador virtual.</span>
          <Link to={getStoreUrl('/probador')}>Entrar al probador <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section className="spatial-store-home__values" aria-label="El atelier AURA">
        <div><Feather /><h3>Fibras escogidas</h3><p>Seda morera, lino italiano, lana merino y algodón Pima.</p></div>
        <div><Shield /><h3>Sastrería de precisión</h3><p>Cortes cuidados, acabados a mano y costuras francesas.</p></div>
        <div><RefreshCw /><h3>Envío protegido</h3><p>Cada pieza viaja en caja rígida y bolsa guardapolvo de algodón.</p></div>
      </section>
    </div>
  );
};
