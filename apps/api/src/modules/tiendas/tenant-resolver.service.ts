import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { StoreEntity } from './entities/store.entity';

const CACHE_TTL_MS = 60_000;

/** Maps a store slug to its tenant id for requests that carry no session. */
@Injectable()
export class TenantResolverService {
  private readonly cache = new Map<string, { id: string; expiresAt: number }>();

  constructor(
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    private readonly configService: ConfigService,
  ) {}

  async resolveSlug(slug?: string): Promise<string> {
    const wanted = (slug || this.configService.get<string>('defaultTenantSlug') || 'aura')
      .toLowerCase()
      .trim();

    const cached = this.cache.get(wanted);
    if (cached && cached.expiresAt > Date.now()) return cached.id;

    const store = await this.storeRepo.findOne({ where: { slug: wanted, estado: 'ACTIVA' } });
    if (!store) throw new NotFoundException('Tienda no encontrada.');

    this.cache.set(wanted, { id: store.id, expiresAt: Date.now() + CACHE_TTL_MS });
    return store.id;
  }
}
