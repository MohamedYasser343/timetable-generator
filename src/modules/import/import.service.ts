import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import { AppDataSource } from '../../../ormconfig';
import { Course } from '../../entities/course.entity';
import { Instructor } from '../../entities/instructor.entity';
import { Room } from '../../entities/room.entity';
import { TimeSlot } from '../../entities/timeslot.entity';
import { Section } from '../../entities/section.entity';

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
    const sectionRepo = AppDataSource.getRepository(Section);

    const [courses, instructors, rooms, timeslots, sections] = await Promise.all([
      readCsv('courses.csv'),
      readCsv('instructors.csv'),
      readCsv('rooms.csv'),
      readCsv('timeSlots.csv'),
      readCsv('sections.csv'),
    ]);

    // Clear
    await Promise.all([courseRepo.clear(), instrRepo.clear(), roomRepo.clear(), tsRepo.clear(), sectionRepo.clear()]);

    // Save courses
    await courseRepo.save(
      courses.map((c) => ({
        code: c.CourseID,
        name: c.CourseName,
        credits: Number(c.Credits || 0),
        type: (c.Type || 'LECTURE').toUpperCase(),
        sessionsPerWeek: Number(c.SessionsPerWeek || 1),
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
        building: r.Building || null,
        floor: r.Floor ? Number(r.Floor) : null,
      })),
    );

    // Save timeslots
    await tsRepo.save(
      timeslots.map((t) => ({
        day: t.Day,
        startTime: t.StartTime,
        endTime: t.EndTime,
        priority: Number(t.Priority || 0),
      })),
    );

    // Save sections
    await sectionRepo.save(
      sections.map((s) => ({
        id: s.SectionID,
        courseCode: s.CourseCode,
        sectionName: s.SectionName,
        capacity: Number(s.Capacity || 30),
        preferredInstructor: s.PreferredInstructor || null,
      })),
    );

    return {
      ok: true,
      counts: {
        courses: courses.length,
        instructors: instructors.length,
        rooms: rooms.length,
        timeslots: timeslots.length,
        sections: sections.length,
      },
    };
  }
}
