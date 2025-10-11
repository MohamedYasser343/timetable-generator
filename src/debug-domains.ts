// src/debug-domains.ts
import { AppDataSource } from '../ormconfig';
import { Course } from './entities/course.entity';
import { Instructor } from './entities/instructor.entity';
import { Room } from './entities/room.entity';
import { TimeSlot } from './entities/timeslot.entity';

async function run() {
  await AppDataSource.initialize();
  const [courses, instructors, rooms, timeslots] = await Promise.all([
    AppDataSource.getRepository(Course).find(),
    AppDataSource.getRepository(Instructor).find(),
    AppDataSource.getRepository(Room).find(),
    AppDataSource.getRepository(TimeSlot).find(),
  ]);

  for (const course of courses) {
    const domain = [];
    const rejected = { preferredSlots:0, roomType:0 };
    for (const ts of timeslots) {
      for (const room of rooms) {
        if (course.type && room.type && course.type.toUpperCase() !== room.type.toUpperCase()) {
          rejected.roomType++;
          continue;
        }
        for (const inst of instructors) {
          // check preferredSlots simple
          const pref = (inst.preferredSlots || '').toLowerCase();
          if (pref.includes('not on') && pref.includes(ts.day.toLowerCase())) {
            rejected.preferredSlots++;
            continue;
          }
          domain.push({tsId: ts.id, room: room.name, instructor: inst.externalId});
        }
      }
    }
    console.log(`Course ${course.code}: domain size = ${domain.length}. rejected:`, rejected);
  }
  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(1); });
