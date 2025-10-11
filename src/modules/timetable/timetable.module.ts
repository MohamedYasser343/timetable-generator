import { Module } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { TimetableController } from './timetable.controller';
import { CspService } from '../csp/csp.service';

@Module({
  providers: [TimetableService, CspService],
  controllers: [TimetableController],
})
export class TimetableModule {}
