import { Module } from '@nestjs/common';
import { TimeslotsController } from './timeslots.controller';
import { TimeslotsService } from './timeslots.service';

@Module({
  controllers: [TimeslotsController],
  providers: [TimeslotsService],
  exports: [TimeslotsService],
})
export class TimeslotsModule {}
