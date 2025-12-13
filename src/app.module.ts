import { Module } from '@nestjs/common';
import { TimetableModule } from './modules/timetable/timetable.module';
import { ImportModule } from './modules/import/import.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { TimeslotsModule } from './modules/timeslots/timeslots.module';
import { CoursesModule } from './modules/courses/courses.module';
import { InstructorsModule } from './modules/instructors/instructors.module';
import { SectionsModule } from './modules/sections/sections.module';

@Module({
  imports: [
    ImportModule,
    TimetableModule,
    RoomsModule,
    TimeslotsModule,
    CoursesModule,
    InstructorsModule,
    SectionsModule,
  ],
})
export class AppModule {}
