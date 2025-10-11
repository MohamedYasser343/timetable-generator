import { Module } from '@nestjs/common';
import { TimetableModule } from './modules/timetable/timetable.module';
import { ImportModule } from './modules/import/import.module';

@Module({
  imports: [ImportModule, TimetableModule],
})
export class AppModule {}
