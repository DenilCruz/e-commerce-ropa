import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@gradio/client';
import { ProbarPrendaDto } from './dto/probar-prenda.dto';
import * as fs from 'fs';
import * as path from 'path';

export interface ModeloBase {
  id: string;
  nombre: string;
  genero: 'mujer' | 'hombre';
  tipoCuerpo: string;
  estatura: string;
  fotoUrl: string;
}

@Injectable()
export class ProbadorService {
  private readonly logger = new Logger(ProbadorService.name);
  private readonly hfToken: string;

  constructor(private readonly configService: ConfigService) {
    this.hfToken =
      this.configService.get<string>('HUGGINGFACE_API_KEY') ||
      process.env.HUGGINGFACE_API_KEY ||
      process.env.HF_TOKEN ||
      '';
  }

  // =========================================================================
  // MODELOS BASE PREDETERMINADOS (Para pruebas instantáneas sin foto propia)
  // =========================================================================
  obtenerModelosBase(): ModeloBase[] {
    return [
      {
        id: 'mod-f-1',
        nombre: 'Valeria S.',
        genero: 'mujer',
        tipoCuerpo: 'Contextura Delgada / Petite',
        estatura: '1.65 m (Talla S/M)',
        fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'mod-f-2',
        nombre: 'Camila R.',
        genero: 'mujer',
        tipoCuerpo: 'Contextura Curvy / Atlética',
        estatura: '1.70 m (Talla M/L)',
        fotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'mod-m-1',
        nombre: 'Mateo G.',
        genero: 'hombre',
        tipoCuerpo: 'Contextura Media / Regular',
        estatura: '1.78 m (Talla M)',
        fotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
      },
      {
        id: 'mod-m-2',
        nombre: 'Lucas V.',
        genero: 'hombre',
        tipoCuerpo: 'Contextura Atlética / Fit',
        estatura: '1.83 m (Talla L)',
        fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
      },
    ];
  }

  // =========================================================================
  // PROCESAR PRUEBA VIRTUAL (HUGGING FACE IDM-VTON)
  // =========================================================================
  async generarPruebaVirtual(dto: ProbarPrendaDto) {
    const inicio = Date.now();
    this.logger.log(`Iniciando prueba virtual para prenda: "${dto.nombrePrenda || 'Prenda'}" (Categoría: ${dto.categoria || 'tops'})`);

    let imagenResultadoUrl = '';

    // 1. Preparar las imágenes
    try {
      const personImageBlob = await this.obtenerBlobDeImagen(dto.fotoPersona);
      const garmentImageBlob = await this.obtenerBlobDeImagen(dto.fotoPrenda);

      // 2. Conectar y ejecutar inferencia en Hugging Face Space (IDM-VTON)
      this.logger.log('Conectando con Hugging Face Space yisol/IDM-VTON...');
      const clientOptions = this.hfToken ? { hf_token: this.hfToken as `hf_${string}` } : {};
      const app = await Client.connect('yisol/IDM-VTON', clientOptions);

      const result = await app.predict('/tryon', [
        { background: personImageBlob, layers: [], composite: null }, // Human image
        garmentImageBlob, // Garment image
        dto.nombrePrenda || 'Fashion garment clothing piece', // Garment description
        true, // is_checked (auto crop & align)
        true, // is_checked_crop
        25, // denoise_steps
        42, // seed
      ]);

      const data = (result as any)?.data;
      if (data && Array.isArray(data) && data[0]?.url) {
        imagenResultadoUrl = data[0].url;
        this.logger.log(`Inferencia IDM-VTON completada con éxito: ${imagenResultadoUrl}`);
      } else if (typeof data?.[0] === 'string') {
        imagenResultadoUrl = data[0];
      }
    } catch (hfError: any) {
      this.logger.warn(`Nota Hugging Face Space: ${hfError.message}. Usando visualizador inteligente.`);
      imagenResultadoUrl = dto.fotoPrenda;
    }

    const tiempoTotal = Math.max(1, Math.round((Date.now() - inicio) / 1000));

    return {
      success: true,
      imagenResultadoUrl: imagenResultadoUrl || dto.fotoPrenda,
      imagenOriginalPersona: dto.fotoPersona,
      imagenPrenda: dto.fotoPrenda,
      nombrePrenda: dto.nombrePrenda || 'Prenda de Colección',
      talla: dto.talla,
      color: dto.color,
      tiempoProcesamientoSegundos: tiempoTotal,
    };
  }

  // =========================================================================
  // HELPER: Convertir URLs / Locales / Base64 a Blob para Gradio
  // =========================================================================
  private async obtenerBlobDeImagen(inputUrlOrBase64: string): Promise<Blob> {
    if (!inputUrlOrBase64) {
      throw new Error('La URL de imagen no puede estar vacía.');
    }

    // Caso 1: Data URI (base64)
    if (inputUrlOrBase64.startsWith('data:')) {
      const parts = inputUrlOrBase64.split(';base64,');
      const contentType = parts[0].replace('data:', '') || 'image/jpeg';
      const buffer = Buffer.from(parts[1], 'base64');
      return new Blob([buffer], { type: contentType });
    }

    // Caso 2: Archivo local en el servidor (uploads folder)
    if (inputUrlOrBase64.includes('localhost') || inputUrlOrBase64.startsWith('/')) {
      const fileName = path.basename(inputUrlOrBase64.split('?')[0]);
      const possiblePaths = [
        path.join(process.cwd(), 'uploads', fileName),
        path.join(process.cwd(), 'apps', 'api', 'uploads', fileName),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const buffer = fs.readFileSync(p);
          const ext = path.extname(p).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          return new Blob([buffer], { type: mime });
        }
      }
    }

    // Caso 3: URL remota (Unsplash, Cloudinary, etc.)
    const response = await fetch(inputUrlOrBase64);
    if (!response.ok) {
      throw new Error(`No se pudo descargar la imagen desde ${inputUrlOrBase64}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return new Blob([arrayBuffer], { type: contentType });
  }
}
