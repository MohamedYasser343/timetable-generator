import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { Course } from '../../entities/course.entity';
import { Instructor } from '../../entities/instructor.entity';
import { Room } from '../../entities/room.entity';
import { TimeSlot } from '../../entities/timeslot.entity';
import { TimetableEntry } from '../../entities/timetable-entry.entity';

interface CourseSession {
  courseCode: string;
  sessionNumber: number; // 1, 2, 3... for multi-session courses
  course: Course;
}

interface Assignment {
  courseCode: string;
  sessionNumber: number;
  instructorId: string;
  roomName: string;
  timeslotId: number;
  instructor: Instructor;
  room: Room;
  timeslot: TimeSlot;
}

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

  // Calculate distance penalty between two rooms
  calculateRoomDistance(room1: Room, room2: Room): number {
    // If no building/floor info, assume adjacent (small penalty)
    if (!room1.building || !room2.building) return 1;

    // Different buildings = large penalty
    if (room1.building !== room2.building) return 10;

    // Same building, different floors
    if (room1.floor !== undefined && room2.floor !== undefined) {
      return Math.abs(room1.floor - room2.floor);
    }

    return 1; // same building, unknown floors
  }

  // Get the day of week as a number for distribution calculation
  getDayNumber(day: string): number {
    const days = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                   'thursday': 4, 'friday': 5, 'saturday': 6 };
    return days[day.toLowerCase()] ?? 0;
  }

  // Check if room type is compatible with course type
  roomTypeCompatible(courseType: string, roomType: string): boolean {
    const ct = courseType.toUpperCase();
    const rt = roomType.toUpperCase();

    // Exact match
    if (ct === rt) return true;

    // "LECTURE AND LAB" can use either LECTURE or LAB rooms
    if (ct.includes('LECTURE') && rt === 'LECTURE') return true;
    if (ct.includes('LAB') && rt === 'LAB') return true;

    return false;
  }

  // Main solver: each course session is a variable
  async solve() {
    const { courses, instructors, rooms, timeslots } = await this.loadAll();

    // Create course sessions (each course with sessionsPerWeek creates multiple variables)
    const courseSessions: CourseSession[] = [];
    for (const course of courses) {
      const sessions = course.sessionsPerWeek || 1;
      for (let i = 1; i <= sessions; i++) {
        courseSessions.push({
          courseCode: course.code,
          sessionNumber: i,
          course
        });
      }
    }

    // Build domains per course session
    const domains = new Map<string, any[]>();
    for (const session of courseSessions) {
      const key = `${session.courseCode}_${session.sessionNumber}`;
      const domain = [];

      for (const ts of timeslots) {
        for (const room of rooms) {
          // HARD: room type must be compatible with course type
          if (session.course.type && room.type &&
              !this.roomTypeCompatible(session.course.type, room.type)) continue;

          for (const inst of instructors) {
            // HARD: respect instructor day preferences
            if (!this.instructorAllowsTimeslot(inst, ts)) continue;
            domain.push({ timeslot: ts, room, instructor: inst });
          }
        }
      }

      // Fallback: if domain empty, relax instructor preferences
      if (domain.length === 0) {
        for (const ts of timeslots) {
          for (const room of rooms) {
            if (session.course.type && room.type &&
                !this.roomTypeCompatible(session.course.type, room.type)) continue;
            for (const inst of instructors) {
              domain.push({ timeslot: ts, room, instructor: inst });
            }
          }
        }
      }

      domains.set(key, domain);
    }

    // Order by smallest domain first (MRV heuristic)
    const order = [...domains.entries()].sort((a, b) => a[1].length - b[1].length);

    const assignment: Assignment[] = [];

    // HARD CONSTRAINT CHECKS
    const violatesHard = (candidate: Assignment): boolean => {
      for (const a of assignment) {
        // No instructor teaches multiple classes at same time
        if (a.instructorId === candidate.instructorId &&
            a.timeslotId === candidate.timeslotId) return true;

        // No room hosts multiple classes at same time
        if (a.roomName === candidate.roomName &&
            a.timeslotId === candidate.timeslotId) return true;
      }
      return false;
    };

    // SOFT CONSTRAINT SCORING (lower score = better)
    const scoreCandidate = (session: CourseSession, cand: any, assignment: Assignment[]): number => {
      let score = 0;

      // SOFT: Prefer qualified instructors (strong preference)
      if (this.instructorQualified(cand.instructor, session.course)) {
        score -= 50;
      }

      // SOFT: Avoid early morning/late evening (use priority field)
      score += (cand.timeslot.priority || 0) * 10;

      // SOFT: Avoid consecutive distant rooms for same instructor
      const instructorPrevAssignments = assignment
        .filter(a => a.instructorId === cand.instructor.externalId)
        .sort((a, b) => {
          // Sort by day then time
          if (a.timeslot.day !== b.timeslot.day) {
            return this.getDayNumber(a.timeslot.day) - this.getDayNumber(b.timeslot.day);
          }
          return a.timeslot.startTime.localeCompare(b.timeslot.startTime);
        });

      // Check if this would be consecutive with any previous assignment
      for (let i = 0; i < instructorPrevAssignments.length; i++) {
        const prev = instructorPrevAssignments[i];
        // If on same day and potentially consecutive slots
        if (prev.timeslot.day === cand.timeslot.day) {
          const distance = this.calculateRoomDistance(prev.room, cand.room);
          score += distance * 5; // penalize distant rooms
        }
      }

      // SOFT: Distribute classes evenly across the week
      // Count how many classes already on this day for this course
      const courseAssignmentsOnDay = assignment
        .filter(a => a.courseCode === session.courseCode &&
                     a.timeslot.day === cand.timeslot.day)
        .length;
      score += courseAssignmentsOnDay * 15; // penalize clustering on same day

      // SOFT: Try to minimize gaps for students (approximate: prefer consecutive times)
      const courseAssignments = assignment
        .filter(a => a.courseCode === session.courseCode);

      if (courseAssignments.length > 0) {
        // Prefer times that are close to existing assignments
        let minGap = Infinity;
        for (const prev of courseAssignments) {
          if (prev.timeslot.day === cand.timeslot.day) {
            // On same day - calculate time gap
            const gap = Math.abs(
              this.timeToMinutes(cand.timeslot.startTime) -
              this.timeToMinutes(prev.timeslot.endTime)
            );
            minGap = Math.min(minGap, gap);
          }
        }
        // Small penalty for gaps > 1 hour
        if (minGap !== Infinity && minGap > 60) {
          score += Math.floor(minGap / 60) * 3;
        }
      }

      return score;
    };

    // Helper to convert time string to minutes
    const timeToMinutes = (timeStr: string): number => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };
    this.timeToMinutes = timeToMinutes;

    // Backtracking search
    const backtrack = (index: number): boolean => {
      if (index >= order.length) return true;

      const [key, domain] = order[index];
      if (!domain || domain.length === 0) return false;

      // Parse key to get session info
      const [courseCode, sessionNum] = key.split('_');
      const course = courses.find(c => c.code === courseCode);
      const session: CourseSession = {
        courseCode,
        sessionNumber: parseInt(sessionNum),
        course
      };

      // Sort domain by soft constraint score (best first)
      const sorted = domain
        .map(d => ({ ...d, score: scoreCandidate(session, d, assignment) }))
        .sort((a, b) => a.score - b.score);

      for (const d of sorted) {
        const candidate: Assignment = {
          courseCode,
          sessionNumber: session.sessionNumber,
          instructorId: d.instructor.externalId,
          roomName: d.room.name,
          timeslotId: d.timeslot.id,
          instructor: d.instructor,
          room: d.room,
          timeslot: d.timeslot
        };

        if (violatesHard(candidate)) continue;

        assignment.push(candidate);
        if (backtrack(index + 1)) return true;
        assignment.pop();
      }

      return false;
    };

    const ok = backtrack(0);
    if (!ok) {
      throw new Error('No feasible assignment found for given data and constraints');
    }

    // Return timetable entries
    return assignment.map(a => ({
      courseCode: a.courseCode,
      instructorId: a.instructorId,
      roomName: a.roomName,
      timeslotId: a.timeslotId
    }));
  }

  // Helper method for time conversion (needs to be accessible in solve)
  private timeToMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
}
