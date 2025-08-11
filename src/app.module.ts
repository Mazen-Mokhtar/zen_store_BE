import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserModule } from './User/user.module';
import { GameModuleAdmin } from './modules/SuperAdmin/game/game.module';
import { GameModule } from './modules/game/game.module';
import { SuperAdminPackagesModule } from './modules/SuperAdmin/packages/packages.module';
import { PackagesModule } from './modules/packages/packages.module';
import { categoryModule } from './modules/category/category.module';
import { OrderModule } from './modules/order/order.module';
@Module({
  imports: [MongooseModule.forRoot(process.env.DB_URL as string),
  EventEmitterModule.forRoot(),
    AuthModule,
    UserModule,
    GameModuleAdmin,
    GameModule,
    SuperAdminPackagesModule,
    PackagesModule,
    categoryModule,
    OrderModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
