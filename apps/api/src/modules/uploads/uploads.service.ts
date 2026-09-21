import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
const sharp = require('sharp');
import * as fs from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

import { ArchivoEntity } from './entities/archivo.entity';
import { ProductImageEntity } from '../productos/entities/product-image.entity';
import { CategoriaEntity } from '../categorias/entities/category.entity';
import { UserEntity } from '../usuarios/entities/user.entity';
import { ArchivoRespuestaDto, EstadoCloudinaryDto } from './dto/archivo-respuesta.dto';

@Injectable()
export class ArchivosService {
  private readonly logger = new Logger(ArchivosService.name);
  private readonly uploadsLocalPath: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ArchivoEntity)
    private readonly repositorioArchivo: Repository<ArchivoEntity>,
    @InjectRepository(ProductImageEntity)
    private readonly repositorioImagenProducto: Repository<ProductImageEntity>,
    @InjectRepository(CategoriaEntity)
    private readonly repositorioCategoria: Repository<CategoriaEntity>,
    @InjectRepository(UserEntity)
    private readonly repositorioUsuario: Repository<UserEntity>,
  ) {
    this.uploadsLocalPath = process.cwd().endsWith('apps/api')
      ? join(process.cwd(), 'uploads')
      : join(process.cwd(), 'apps', 'api', 'uploads');

    if (!fs.existsSync(this.uploadsLocalPath)) {
      fs.mkdirSync(this.uploadsLocalPath, { recursive: true });
    }

    this.inicializarCloudinary();
  }

  /**
   * Configura las credenciales del SDK de Cloudinary si están presentes
   */
  private inicializarCloudinary(): boolean {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret && cloudName.trim() !== '' && apiKey.trim() !== '' && apiSecret.trim() !== '') {
      cloudinary.config({
        cloud_name: cloudName.trim(),
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        secure: true,
      });
      this.logger.log(`Cloudinary configurado exitosamente para la nube: ${cloudName}`);
      return true;
    }

    this.logger.warn('Cloudinary no configurado en variables de entorno. Operando en Modo Almacenamiento Local.');
    return false;
  }

  /**
   * Verifica si Cloudinary cuenta con credenciales activas
   */
  isCloudinaryConfigured(): boolean {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    return Boolean(cloudName && apiKey && apiSecret && cloudName.trim() !== '' && apiKey.trim() !== '' && apiSecret.trim() !== '');
  }

  /**
   * Obtiene el estado actual de la integración con Cloudinary
   */
  obtenerEstadoCloudinary(): EstadoCloudinaryDto {
    const configurado = this.isCloudinaryConfigured();
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || undefined;

    return {
      configurado,
      cloudName: configurado ? cloudName : undefined,
      modoPorDefecto: configurado ? 'cloudinary' : 'local',
    };
  }

  /**
   * HU-83: Comprimir y optimizar imágenes al subirlas (Rol Sistema)
   * Redimensiona inteligentemente según el propósito y convierte a WebP con compresión de alta calidad
   */
  async optimizarImagen(
    fileBuffer: Buffer,
    categoria: string = 'general',
  ): Promise<{
    buffer: Buffer;
    pesoOriginal: number;
    pesoOptimizado: number;
    porcentajeAhorro: number;
    ancho?: number;
    alto?: number;
  }> {
    const pesoOriginal = fileBuffer.length;
    let pipeline = sharp(fileBuffer);

    // Determinar dimensiones según categoría
    const esPerfil = categoria.toLowerCase().includes('perfil');
    if (esPerfil) {
      // Perfiles: recorte cuadrado centrado máx 500x500
      pipeline = pipeline.resize(500, 500, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true,
      });
    } else {
      // Prendas y categorías: máx 1920x1920 manteniendo aspecto original
      pipeline = pipeline.resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Conversión a WebP optimizado con descarte de metadatos EXIF innecesarios
    const buffer = await pipeline
      .webp({
        quality: 82,
        effort: 4,
        lossless: false,
      })
      .toBuffer();

    const metadata = await sharp(buffer).metadata();
    const pesoOptimizado = buffer.length;
    const porcentajeAhorro = Math.max(0, Math.round(((pesoOriginal - pesoOptimizado) / pesoOriginal) * 100));

    return {
      buffer,
      pesoOriginal,
      pesoOptimizado,
      porcentajeAhorro,
      ancho: metadata.width,
      alto: metadata.height,
    };
  }

  /**
   * HU-80, HU-82, HU-83: Subir imagen optimizada a Cloudinary o almacenamiento local
   */
  async procesarSubida(
    file: Express.Multer.File,
    req: Request,
    usuarioId?: string,
  ): Promise<ArchivoRespuestaDto> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo de imagen para procesar.');
    }

    // Aceptar cualquier formato de imagen estándar (JPG, PNG, WebP, AVIF, GIF)
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('El archivo proporcionado no es una imagen válida.');
    }

    // Categoría / Carpeta destino
    let categoria = req.body?.categoria ? req.body.categoria.toString().trim() : 'general';
    const slugCategoria = categoria.toLowerCase().replace(/\s+/g, '-');

    // 1. HU-83: Optimización y compresión a WebP
    const optimizada = await this.optimizarImagen(file.buffer, slugCategoria);

    // Generación de nombre limpio para el archivo
    const nombreOriginalLimpio = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
    const sufijoUuid = uuidv4().split('-')[0];
    const nombreArchivoFinal = `${nombreOriginalLimpio}_${sufijoUuid}.webp`;

    let urlFinal = '';
    let publicId: string | undefined = undefined;
    let almacenamiento: 'cloudinary' | 'local' = 'local';

    // 2. HU-80: Si Cloudinary está disponible, subir a Cloudinary
    if (this.isCloudinaryConfigured()) {
      try {
        const resultadoCloudinary = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `ecommerce/${slugCategoria}`,
              public_id: `${nombreOriginalLimpio}_${sufijoUuid}`,
              format: 'webp',
              resource_type: 'image',
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result!);
            },
          );
          uploadStream.end(optimizada.buffer);
        });

        urlFinal = resultadoCloudinary.secure_url;
        publicId = resultadoCloudinary.public_id;
        almacenamiento = 'cloudinary';
      } catch (errorCloudinary: any) {
        this.logger.error(`Fallo al subir a Cloudinary: ${errorCloudinary.message}. Recurriendo a almacenamiento local.`);
      }
    }

    // 3. Fallback / Modo Local si no se usó Cloudinary
    if (!urlFinal) {
      const carpetaDestino = join(this.uploadsLocalPath, slugCategoria);
      if (!fs.existsSync(carpetaDestino)) {
        fs.mkdirSync(carpetaDestino, { recursive: true });
      }

      const rutaArchivoLocal = join(carpetaDestino, nombreArchivoFinal);
      fs.writeFileSync(rutaArchivoLocal, optimizada.buffer);

      urlFinal = `/uploads/${slugCategoria}/${nombreArchivoFinal}`;
      almacenamiento = 'local';
    }

    // 4. Registrar en tabla `archivo` para auditoría y control de obsolescencia
    try {
      const nuevoArchivo = this.repositorioArchivo.create({
        nombreOriginal: file.originalname,
        nombreArchivo: nombreArchivoFinal,
        url: urlFinal,
        publicId,
        formato: 'webp',
        mimetype: 'image/webp',
        pesoBytes: optimizada.pesoOptimizado,
        pesoOriginalBytes: optimizada.pesoOriginal,
        porcentajeAhorro: optimizada.porcentajeAhorro,
        almacenamiento,
        categoria: slugCategoria,
        usuarioId: usuarioId || req.user ? (req.user as any)?.id : undefined,
      });

      const guardado = await this.repositorioArchivo.save(nuevoArchivo);

      return {
        id: guardado.id,
        url: urlFinal,
        nombre: nombreArchivoFinal,
        nombreOriginal: file.originalname,
        publicId,
        formato: 'webp',
        tamanio: optimizada.pesoOptimizado,
        tamanioOriginal: optimizada.pesoOriginal,
        porcentajeAhorro: optimizada.porcentajeAhorro,
        almacenamiento,
        categoria: slugCategoria,
      };
    } catch (dbErr: any) {
      this.logger.warn(`No se pudo registrar metadatos en tabla archivo: ${dbErr.message}`);
      return {
        url: urlFinal,
        nombre: nombreArchivoFinal,
        nombreOriginal: file.originalname,
        publicId,
        formato: 'webp',
        tamanio: optimizada.pesoOptimizado,
        tamanioOriginal: optimizada.pesoOriginal,
        porcentajeAhorro: optimizada.porcentajeAhorro,
        almacenamiento,
        categoria: slugCategoria,
      };
    }
  }

  /**
   * HU-81: Listar archivos multimedia y detectar imágenes obsoletas (no vinculadas)
   */
  async obtenerArchivos(
    categoria?: string,
    filtroUso?: 'todos' | 'en_uso' | 'obsoleto',
  ): Promise<any[]> {
    // 1. Obtener todas las imágenes registradas en la tabla archivo
    const qb = this.repositorioArchivo.createQueryBuilder('archivo');
    if (categoria && categoria !== 'todas') {
      qb.where('archivo.categoria = :categoria', { categoria });
    }
    qb.orderBy('archivo.creado_en', 'DESC');
    const archivosRegistrados = await qb.getMany();

    // 2. Obtener imágenes vinculadas en la plataforma
    const imagenesProductos = await this.repositorioImagenProducto.find({ relations: ['producto'] });
    const categorias = await this.repositorioCategoria.find();
    const usuarios = await this.repositorioUsuario.find();

    // Crear mapas de búsqueda de URLs vinculadas
    const mapUrlsProductos = new Map<string, string>();
    for (const img of imagenesProductos) {
      if (img.url) {
        mapUrlsProductos.set(img.url, img.producto?.nombre || 'Producto vinculado');
      }
    }

    const mapUrlsCategorias = new Map<string, string>();
    for (const cat of categorias) {
      if (cat.imagen) {
        mapUrlsCategorias.set(cat.imagen, `Categoría: ${cat.nombre}`);
      }
    }

    const mapUrlsUsuarios = new Map<string, string>();
    for (const u of usuarios) {
      if (u.foto) {
        mapUrlsUsuarios.set(u.foto, `Perfil: ${u.nombre} ${u.apellido}`);
      }
    }

    // 3. Evaluar estado de uso para cada archivo registrado
    const listaResultados: any[] = [];
    const urlsProcesadas = new Set<string>();

    for (const arch of archivosRegistrados) {
      urlsProcesadas.add(arch.url);

      const vinculadoA =
        mapUrlsProductos.get(arch.url) ||
        mapUrlsCategorias.get(arch.url) ||
        mapUrlsUsuarios.get(arch.url) ||
        null;

      const enUso = Boolean(vinculadoA);

      listaResultados.push({
        id: arch.id,
        nombreOriginal: arch.nombreOriginal,
        nombreArchivo: arch.nombreArchivo,
        url: arch.url,
        publicId: arch.publicId,
        formato: arch.formato,
        tamanio: arch.pesoBytes,
        tamanioOriginal: arch.pesoOriginalBytes,
        porcentajeAhorro: arch.porcentajeAhorro,
        almacenamiento: arch.almacenamiento,
        categoria: arch.categoria,
        creadoEn: arch.creadoEn,
        enUso,
        vinculadoA,
      });
    }

    // 4. Auto-descubrimiento: agregar imágenes de productos que no estaban en `archivo`
    for (const img of imagenesProductos) {
      if (img.url && !urlsProcesadas.has(img.url)) {
        urlsProcesadas.add(img.url);
        listaResultados.push({
          id: img.id,
          nombreOriginal: 'Producto Imagen',
          nombreArchivo: img.url.split('/').pop() || 'imagen.webp',
          url: img.url,
          publicId: (img as any).publicId,
          formato: img.formato || 'webp',
          tamanio: 0,
          almacenamiento: img.url.includes('cloudinary.com') ? 'cloudinary' : 'local',
          categoria: 'productos',
          creadoEn: img.creadoEn,
          enUso: true,
          vinculadoA: img.producto?.nombre || 'Producto vinculado',
        });
      }
    }

    // 5. Filtrar según el parámetro filtroUso
    if (filtroUso === 'en_uso') {
      return listaResultados.filter((a) => a.enUso);
    } else if (filtroUso === 'obsoleto') {
      return listaResultados.filter((a) => !a.enUso);
    }

    return listaResultados;
  }

  /**
   * HU-81: Eliminar imagen obsoleta de Cloudinary, disco local y base de datos
   */
  async eliminarArchivo(identificador: string): Promise<{ exito: boolean; mensaje: string }> {
    // Buscar en tabla de archivos por ID, URL o publicId
    let archivo = await this.repositorioArchivo.findOne({
      where: [
        { id: identificador },
        { url: identificador },
        { publicId: identificador },
      ],
    });

    let urlTarget = archivo ? archivo.url : identificador;
    let publicIdTarget = archivo ? archivo.publicId : undefined;

    // 1. Si está en Cloudinary, destruir en la nube
    if (publicIdTarget) {
      try {
        await cloudinary.uploader.destroy(publicIdTarget);
        this.logger.log(`Recurso eliminado de Cloudinary con public_id: ${publicIdTarget}`);
      } catch (err: any) {
        this.logger.warn(`Error al destruir recurso en Cloudinary: ${err.message}`);
      }
    } else if (urlTarget.includes('res.cloudinary.com')) {
      // Intentar extraer el public_id de la URL
      try {
        const matches = urlTarget.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
        if (matches && matches[1]) {
          await cloudinary.uploader.destroy(matches[1]);
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo extraer o destruir publicId de la URL Cloudinary: ${err.message}`);
      }
    }

    // 2. Si es local, eliminar de disco
    if (urlTarget.startsWith('/uploads/')) {
      const subRuta = urlTarget.replace('/uploads/', '');
      const rutaFisica = join(this.uploadsLocalPath, subRuta);
      if (fs.existsSync(rutaFisica)) {
        try {
          fs.unlinkSync(rutaFisica);
          this.logger.log(`Archivo local eliminado físicamente: ${rutaFisica}`);
        } catch (err: any) {
          this.logger.warn(`Error al eliminar archivo físico local: ${err.message}`);
        }
      }
    }

    // 3. Eliminar de imagen_producto si existe
    const imgProd = await this.repositorioImagenProducto.findOne({
      where: [{ id: identificador }, { url: urlTarget }],
    });
    if (imgProd) {
      await this.repositorioImagenProducto.remove(imgProd);
    }

    // 4. Eliminar de la tabla archivo
    if (archivo) {
      await this.repositorioArchivo.remove(archivo);
    }

    return {
      exito: true,
      mensaje: 'Imagen obsoleta eliminada exitosamente del almacenamiento.',
    };
  }

  /**
   * HU-81: Limpieza en lote de todas las imágenes obsoletas / huérfanas
   */
  async limpiarArchivosObsoletos(): Promise<{
    exito: boolean;
    totalEliminados: number;
    mensaje: string;
  }> {
    const obsoletos = await this.obtenerArchivos(undefined, 'obsoleto');
    let totalEliminados = 0;

    for (const item of obsoletos) {
      try {
        await this.eliminarArchivo(item.id || item.url);
        totalEliminados++;
      } catch (err: any) {
        this.logger.error(`Fallo al eliminar archivo obsoleto ${item.url}: ${err.message}`);
      }
    }

    return {
      exito: true,
      totalEliminados,
      mensaje: `Se eliminaron exitosamente ${totalEliminados} imagen(es) obsoleta(s) liberando espacio.`,
    };
  }
}
