import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTenantStore } from '../../../hooks/useTenantStore';

type Section = { title: string; body: string[] };
type Topic = { label: string; headline: string; intro: string; sections: Section[] };

/** Customer-facing help pages. Every statement here describes something the store really does. */
const TOPICS: Record<string, Topic> = {
  envios: {
    label: 'Envíos y entregas',
    headline: 'Tu pedido, bien cuidado hasta tu puerta',
    intro: 'Cada prenda sale protegida en empaque rígido y puedes seguir su recorrido en todo momento.',
    sections: [
      {
        title: 'Envío estándar',
        body: ['Llega en 2 a 3 días hábiles, en empaque rígido protegido. Es cortesía de la casa para tus compras que califican.'],
      },
      {
        title: 'Envío express',
        body: ['Entrega prioritaria asegurada en 24 horas, con un costo adicional de $20.00 que verás antes de pagar.'],
      },
      {
        title: 'Sigue tu pedido',
        body: [
          'Con el código de tu guía puedes ver dónde está tu paquete en el mapa, desde la sección Seguimiento.',
          'Si ya iniciaste sesión, también lo encuentras en Mis pedidos.',
        ],
      },
    ],
  },
  pagos: {
    label: 'Formas de pago',
    headline: 'Paga como prefieras, con total tranquilidad',
    intro: 'Todos los precios están en dólares estadounidenses (USD) y los impuestos se calculan al finalizar tu compra.',
    sections: [
      {
        title: 'Tarjeta de débito o crédito',
        body: ['Pagas en un formulario seguro con cifrado bancario. El pedido pasa a preparación apenas se confirma el pago.'],
      },
      {
        title: 'Transferencia con QR',
        body: ['Escaneas el código QR con la app de tu banco, confirmas la transacción y registras el número de comprobante para confirmar tu pedido.'],
      },
      {
        title: 'Pago contra entrega',
        body: ['Pagas en efectivo al recibir tu paquete.'],
      },
    ],
  },
  cuidados: {
    label: 'Guía de cuidados',
    headline: 'Haz que tus prendas duren más',
    intro: 'Un buen cuidado mantiene la caída, el color y la textura. Revisa siempre la etiqueta de cada prenda.',
    sections: [
      {
        title: 'Seda y satén',
        body: ['Lava a mano con agua fría y un detergente suave, sin retorcer. Seca a la sombra y plancha del revés a temperatura baja.'],
      },
      {
        title: 'Lana y abrigos',
        body: ['Prefiere la limpieza en seco una o dos veces por temporada. Cuélgalos en una percha ancha y cepíllalos para quitar el polvo.'],
      },
      {
        title: 'Algodón y lino',
        body: ['Lava a máquina con agua fría o tibia, en ciclo delicado. El lino se plancha ligeramente húmedo para un acabado impecable.'],
      },
      {
        title: 'Guardado',
        body: ['Guarda tus prendas limpias y secas, en un lugar ventilado y lejos de la luz directa del sol.'],
      },
    ],
  },
  politicas: {
    label: 'Políticas',
    headline: 'Claridad en cada paso de tu compra',
    intro: 'Así funciona tu pedido desde que lo haces hasta que lo recibes.',
    sections: [
      {
        title: 'Estado de tu pedido',
        body: ['En Mis pedidos ves en qué punto está cada compra: pendiente, pagado, enviado, entregado, cancelado o reembolsado.'],
      },
      {
        title: 'Cancelaciones',
        body: ['Puedes cancelar un pedido desde Mis pedidos mientras esté pendiente o pagado y todavía no haya salido a reparto.'],
      },
      {
        title: 'Disponibilidad',
        body: ['Cada prenda muestra las piezas disponibles por talla, para que sepas qué puedes llevarte.'],
      },
      {
        title: 'Precios',
        body: ['Los precios están en dólares estadounidenses (USD). El costo de envío y los impuestos se muestran antes de pagar.'],
      },
    ],
  },
  privacidad: {
    label: 'Privacidad',
    headline: 'Tus datos, solo para que tu compra salga bien',
    intro: 'Esto es lo que guardamos cuando usas la tienda y para qué lo usamos.',
    sections: [
      {
        title: 'Qué guardamos',
        body: [
          'Los datos de tu cuenta (nombre, apellido, correo y teléfono), tus direcciones de entrega, tu historial de pedidos y tus favoritos.',
          'Si usas el probador virtual, la imagen que subes para probarte la prenda.',
        ],
      },
      {
        title: 'Para qué los usamos',
        body: ['Para procesar y entregar tus pedidos, mostrarte tu historial y recordar tus preferencias en la tienda.'],
      },
      {
        title: 'Tus pagos',
        body: ['Los pagos con tarjeta los procesa un proveedor de pagos externo mediante un formulario seguro.'],
      },
      {
        title: 'Tu control',
        body: ['Puedes actualizar tus datos personales, tu contraseña y tus direcciones en cualquier momento desde Mi perfil.'],
      },
    ],
  },
};

export const INFO_TOPICS = Object.entries(TOPICS).map(([id, t]) => ({ id, label: t.label }));

export const StoreInfoPage: React.FC = () => {
  const { tema = '' } = useParams<{ tema: string }>();
  const { getStoreUrl } = useTenantStore();
  const topic = TOPICS[tema];

  if (!topic) return <Navigate to={getStoreUrl('/info/envios')} replace />;

  return (
    <div className="max-w-5xl mx-auto pb-16">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-stone-500 mb-6">
        <Link to={getStoreUrl('/')} className="hover:text-stone-900">Inicio</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-stone-900">{topic.label}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <nav aria-label="Ayuda" className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
          {INFO_TOPICS.map((t) => (
            <Link
              key={t.id}
              to={getStoreUrl(`/info/${t.id}`)}
              aria-current={t.id === tema ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                t.id === tema
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'border-stone-300 text-stone-700 hover:border-stone-900 hover:text-stone-900'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <article>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-stone-900">{topic.headline}</h1>
          <p className="mt-3 text-sm text-stone-600 font-light max-w-xl leading-relaxed">{topic.intro}</p>

          <div className="mt-10 space-y-8">
            {topic.sections.map((s) => (
              <section key={s.title} className="border-t border-stone-200 pt-6">
                <h2 className="font-serif text-xl font-normal text-stone-900">{s.title}</h2>
                <div className="mt-2 space-y-2 max-w-xl">
                  {s.body.map((p) => (
                    <p key={p} className="text-sm text-stone-600 font-light leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link to={getStoreUrl('/catalogo')} className="inline-flex items-center rounded-full bg-stone-900 text-white px-6 py-3 text-xs uppercase tracking-widest">
              Descubrir la colección
            </Link>
            {tema === 'envios' && (
              <Link to={getStoreUrl('/tracking')} className="inline-flex items-center rounded-full border border-stone-300 px-6 py-3 text-xs uppercase tracking-widest text-stone-800 hover:border-stone-900">
                Seguir mi pedido
              </Link>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};
