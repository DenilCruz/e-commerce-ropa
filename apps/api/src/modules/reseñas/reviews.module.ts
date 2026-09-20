import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewEntity } from './entities/review.entity';
import { ResenasService } from './reviews.service';
import { ResenasController } from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity])],
  controllers: [ResenasController],
  providers: [ResenasService],
  exports: [ResenasService],
})
export class ReviewsModule {}
