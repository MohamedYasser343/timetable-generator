import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { AppDataSource } from '../../../ormconfig';
import { Course } from '../../entities/course.entity';
import { Instructor } from '../../entities/instructor.entity';
import { Room } from '../../entities/room.entity';
import { TimeSlot } from '../../entities/timeslot.entity';

function readCsv(path: string): Promise<any[]> {
  return new Promise((resolve) => {
    const rows: any[] = [];
    if (!fs.existsSync(path)) return resolve(rows);
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (d) => rows.push(d))
      .on('end', () => resolve(rows));
  });
}

@Injectable()
export class ImportService {
  async importCsvData() {
    const courseRepo = AppDataSource.getRepository(Course);
    const instrRepo = AppDataSource.getRepository(Instructor);
    const roomRepo = AppDataSource.getRepository(Room);
    const tsRepo = AppDataSource.getRepository(TimeSlot);

    const [courses, instructors, rooms, timeslots] = await Promise.all([
      readCsv('courses.csv'),
      readCsv('instructors.csv'),
      readCsv('rooms.csv'),
      readCsv('timeSlots.csv'),
    ]);

    // Clear
    await Promise.all([courseRepo.clear(), instrRepo.clear(), roomRepo.clear(), tsRepo.clear()]);

    // Save courses
    await courseRepo.save(
      courses.map((c) => ({
        code: c.CourseID,
        name: c.CourseName,
        credits: Number(c.Credits || 0),
        type: (c.Type || 'LECTURE').toUpperCase(),
      })),
    );

    // Save instructors
    await instrRepo.save(
      instructors.map((i) => ({
        externalId: i.InstructorID,
        name: i.Name,
        role: i.Role,
        preferredSlots: i.PreferredSlots || '',
        qualifiedCourses: (i.QualifiedCourses || '').replace(/,\s*/g, ','),
      })),
    );

    // Save rooms
    await roomRepo.save(
      rooms.map((r) => ({
        name: r.RoomID,
        type: (r.Type || 'LECTURE').toUpperCase(),
        capacity: Number(r.Capacity || 0),
      })),
    );

    // Save timeslots
    await tsRepo.save(
      timeslots.map((t) => ({
        day: t.Day,
        startTime: t.StartTime,
        endTime: t.EndTime,
      })),
    );

    return {
      ok: true,
      counts: {
        courses: courses.length,
        instructors: instructors.length,
        rooms: rooms.length,
        timeslots: timeslots.length,
      },
    };
  }
}
