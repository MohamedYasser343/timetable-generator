import { Module } from '@nestjs/common';
import { CspService } from './csp.service';

@Module({
  providers: [CspService],
  exports: [CspService],
})
export class CspModule {}
