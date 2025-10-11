import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { Course } from '../../entities/course.entity';
import { Instructor } from '../../entities/instructor.entity';
import { Room } from '../../entities/room.entity';
import { TimeSlot } from '../../entities/timeslot.entity';
import { TimetableEntry } from '../../entities/timetable-entry.entity';

@Injectable()
export class CspService {
  async loadAll() {
    const courseRepo = AppDataSource.getRepository(Course);
    const instrRepo = AppDataSource.getRepository(Instructor);
    const roomRepo = AppDataSource.getRepository(Room);
    const tsRepo = AppDataSource.getRepository(TimeSlot);

    const [courses, instructors, rooms, timeslots] = await Promise.all([
      courseRepo.find(),
      instrRepo.find(),
      roomRepo.find(),
      tsRepo.find(),
    ]);

    return { courses, instructors, rooms, timeslots };
  }

  // check if instructor forbids this timeslot day, interpret "Not on <Day>"
  instructorAllowsTimeslot(instr: Instructor, ts: TimeSlot) {
    if (!instr.preferredSlots) return true;
    const text = instr.preferredSlots.toLowerCase();
    const forbids = (text.match(/not on [a-z]+/g) || []).map(s => s.replace('not on ', '').trim());
    return !forbids.some(f => f.toLowerCase() === ts.day.toLowerCase());
  }

  // check qualification; returns boolean
  instructorQualified(instr: Instructor, course: Course) {
    if (!instr.qualifiedCourses) return false;
    const set = instr.qualifiedCourses.split(',').map(s => s.trim().toUpperCase());
    return set.includes(course.code.toUpperCase());
  }

  // Main solver: courses are variables to assign
  async solve() {
    const { courses, instructors, rooms, timeslots } = await this.loadAll();

    // Build domains per course
    const domains = new Map<string, any[]>();
    for (const course of courses) {
      const domain = [];
      for (const ts of timeslots) {
        for (const room of rooms) {
          // room type match
          if (course.type && room.type && course.type.toUpperCase() !== room.type.toUpperCase()) continue;
          for (const inst of instructors) {
            // respect preferredSlots as hard: skip if instructor forbids ts.day
            if (!this.instructorAllowsTimeslot(inst, ts)) continue;
            domain.push({ timeslot: ts, room, instructor: inst });
          }
        }
      }
      // if domain empty (e.g., all instructors said "Not on Sunday" but only Sunday slots exist)
      // relax preferredSlots and allow any instructor that matches room type
      if (domain.length === 0) {
        for (const ts of timeslots) {
          for (const room of rooms) {
            if (course.type && room.type && course.type.toUpperCase() !== room.type.toUpperCase()) continue;
            for (const inst of instructors) {
              domain.push({ timeslot: ts, room, instructor: inst });
            }
          }
        }
      }
      domains.set(course.code, domain);
    }

    // Order courses by smallest domain
    const order = [...domains.entries()].sort((a, b) => a[1].length - b[1].length);

    const assignment: any[] = [];

    const violatesHard = (candidate) => {
      // check against current assignment:
      for (const a of assignment) {
        // same instructor same timeslot?
        if (a.instructorId === candidate.instructor.externalId && a.timeslotId === candidate.timeslot.id) return true;
        // same room same timeslot?
        if (a.roomName === candidate.room.name && a.timeslotId === candidate.timeslot.id) return true;
      }
      return false;
    };

    const scoreCandidate = (course: Course, cand) => {
      let score = 0;
      if (this.instructorQualified(cand.instructor, course)) score -= 5; // prefer qualified
      return score;
    };

    const backtrack = (index) => {
      if (index >= order.length) return true;
      const [courseCode, domain] = order[index];
      // if domain empty => fail
      if (!domain || domain.length === 0) return false;

      // sort domain by soft score best first
      const course = courses.find(c => c.code === courseCode);
      const sorted = domain
        .map(d => ({ ...d, score: scoreCandidate(course, d) }))
        .sort((a, b) => a.score - b.score);

      for (const d of sorted) {
        const cand = {
          courseCode,
          instructorId: d.instructor.externalId,
          roomName: d.room.name,
          timeslotId: d.timeslot.id,
          instructor: d.instructor,
          room: d.room,
          timeslot: d.timeslot
        };
        if (violatesHard(cand)) continue;
        assignment.push(cand);
        if (backtrack(index + 1)) return true;
        assignment.pop();
      }
      return false;
    };

    const ok = backtrack(0);
    if (!ok) throw new Error('No feasible assignment found for given data and constraints');

    // reduce to timetable entries
    return assignment.map(a => ({
      courseCode: a.courseCode,
      instructorId: a.instructorId,
      roomName: a.roomName,
      timeslotId: a.timeslotId
    }));
  }
}
