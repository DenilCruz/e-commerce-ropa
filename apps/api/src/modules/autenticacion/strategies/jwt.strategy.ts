import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UserStoreEntity } from '../../tiendas/entities/user-store.entity';
import { TenantContext } from '../../../common/tenant/tenant-context';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserStoreEntity)
    private readonly memberships: Repository<UserStoreEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'jwt_secret',
    });
  }

  async validate(payload: any) {
    if (!payload.tid) {
      throw new UnauthorizedException('Tu sesión es de una versión anterior. Inicia sesión nuevamente.');
    }

    // The signed claim selects the store; it must be active before querying (row-level security)
    TenantContext.set(payload.tid);
    TenantContext.setUser(payload.sub);

    // The role always comes from the live membership, not from the token claim
    const membership = await this.memberships.findOne({
      where: { usuarioId: payload.sub, tiendaId: payload.tid, activo: true },
      relations: ['rol'],
    });
    if (!membership) {
      throw new UnauthorizedException('Ya no tienes acceso a esta tienda.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: membership.rol?.nombre ?? payload.role,
      tenantId: payload.tid,
    };
  }
}
