import { DataSource } from 'typeorm';
import { Course } from './src/entities/course.entity';
import { Instructor } from './src/entities/instructor.entity';
import { Room } from './src/entities/room.entity';
import { TimeSlot } from './src/entities/timeslot.entity';
import { TimetableEntry } from './src/entities/timetable-entry.entity';
import { Section } from './src/entities/section.entity';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'timetable.sqlite',
  synchronize: true,
  logging: false,
  entities: [Course, Instructor, Room, TimeSlot, TimetableEntry, Section],
});
