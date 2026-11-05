import { Module } from '@nestjs/common';
import { DataCipher } from '../../common/crypto';
import { ENV, type Env } from '../../config/env';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { InvitesController } from './invites.controller';
import { PasskeysController } from './passkeys.controller';
import { PasswordService } from './password.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { LoginThrottle } from './throttle.service';
import { TotpController } from './totp.controller';
import { TotpService } from './totp.service';

@Module({
  controllers: [AuthController, TotpController, PasskeysController, InvitesController],
  providers: [
    AuthRepository,
    PasswordService,
    TotpService,
    SessionService,
    LoginThrottle,
    SessionGuard,
    { provide: DataCipher, inject: [ENV], useFactory: (env: Env) => new DataCipher(env.DATA_ENCRYPTION_KEY) },
  ],
  exports: [SessionService, SessionGuard, AuthRepository],
})
export class AuthModule {}
