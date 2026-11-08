import { useCallback, useEffect, useState } from 'react';
import {
  OfertaInstalacion,
  decidirOferta,
  descartarOferta,
  enSilencio,
  esSafariIos,
  estaInstalada,
  guiaIosVista,
  marcarGuiaIosVista,
} from '../../lib/pwaInstall';

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const almacen = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const yaInstalada = () =>
  estaInstalada(window.matchMedia?.('(display-mode: standalone)').matches ?? false, (navigator as any).standalone);

/** Captures `beforeinstallprompt` and decides whether to offer the install button or the iOS hint. */
export function useInstalarApp() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [instalada, setInstalada] = useState<boolean>(() => (typeof window === 'undefined' ? false : yaInstalada()));
  const [version, setVersion] = useState(0); // bumps to re-read the stored "not now"

  useEffect(() => {
    const alOfrecer = (e: Event) => {
      e.preventDefault(); // keep the event to open the prompt from our own button
      setEvento(e as EventoInstalacion);
    };
    const alInstalar = () => {
      setInstalada(true);
      setEvento(null);
    };
    window.addEventListener('beforeinstallprompt', alOfrecer);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const oferta: OfertaInstalacion =
    typeof window === 'undefined'
      ? null
      : decidirOferta({
          hayEventoDeInstalacion: evento !== null,
          instalada,
          safariIos: esSafariIos(navigator.userAgent, navigator.maxTouchPoints),
          silencio: version >= 0 && enSilencio(almacen()),
          guiaIosYaVista: guiaIosVista(almacen()),
        });

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setEvento(null); // the event can only be used once
    if (outcome === 'dismissed') {
      descartarOferta(almacen());
      setVersion((v) => v + 1);
    }
  }, [evento]);

  const descartar = useCallback(() => {
    if (oferta === 'GUIA_IOS') marcarGuiaIosVista(almacen());
    else descartarOferta(almacen());
    setVersion((v) => v + 1);
  }, [oferta]);

  return { oferta, instalar, descartar };
}
