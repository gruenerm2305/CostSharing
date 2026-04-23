import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { OcrModule } from './ocr/ocr.module';
import { SplittingModule } from './splitting/splitting.module';
import { HealthController } from './health/health.controller';

const parseBoolean = (value?: string): boolean => value?.toLowerCase() === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: parseBoolean(configService.get<string>('DB_SYNCHRONIZE')),
        logging: parseBoolean(configService.get<string>('DB_LOGGING')),
        extra: {
          options: '-c timezone=UTC',
        },
      }),
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ReceiptsModule,
    OcrModule,
    SplittingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
