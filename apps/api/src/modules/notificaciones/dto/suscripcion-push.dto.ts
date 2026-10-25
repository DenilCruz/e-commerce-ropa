import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

class ClavesPushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  auth: string;
}

export class SuscripcionPushDto {
  @IsUrl({ require_tld: false, protocols: ['https'] })
  @MaxLength(1000)
  endpoint: string;

  @ValidateNested()
  @Type(() => ClavesPushDto)
  keys: ClavesPushDto;
}

export class BajaPushDto {
  @IsUrl({ require_tld: false, protocols: ['https'] })
  @MaxLength(1000)
  endpoint: string;
}
