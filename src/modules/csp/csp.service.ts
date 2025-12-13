import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { Course } from '../../entities/course.entity';
import { Instructor } from '../../entities/instructor.entity';
import { Room } from '../../entities/room.entity';
import { TimeSlot } from '../../entities/timeslot.entity';
import { TimetableEntry } from '../../entities/timetable-entry.entity';
import { Section } from '../../entities/section.entity';

interface SectionSession {
  sectionId: string;
  courseCode: string;
  sessionNumber: number; // 1, 2, 3... for multi-session courses
  section: Section;
  course: Course;
}

interface Assignment {
  sectionId: string;
  courseCode: string;
  sessionNumber: number;
  instructorId: string;
  roomName: string;
  timeslotId: number;
  instructor: Instructor;
  room: Room;
  timeslot: TimeSlot;
  score?: number;
}

export interface ConstraintBreakdown {
  qualifiedInstructorBonus: number;    // Count of assignments with qualified instructor
  preferredInstructorBonus: number;    // Count of assignments with preferred instructor
  earlyLateSlotPenalties: number;      // Count of early morning/late evening slots used
  distantRoomPenalties: number;        // Total distance penalty points
  clusteringPenalties: number;         // Count of same-day clustering issues
  gapPenalties: number;                // Count of gap penalty applications
}

export interface SolveMetrics {
  totalTimeMs: number;
  dataLoadTimeMs: number;
  domainConstructionTimeMs: number;
  searchTimeMs: number;
  backtrackCount: number;
  fallbackRelaxations: number;
  totalSoftScore: number;
  assignmentCount: number;
  problemSize: {
    totalSections: number;
    totalSectionSessions: number;
    totalTimeslots: number;
    totalRooms: number;
    totalInstructors: number;
    averageDomainSize: number;
    minDomainSize: number;
    maxDomainSize: number;
  };
  constraintBreakdown: ConstraintBreakdown;
}

export interface SolveResult {
  assignments: {
    sectionId: string;
    courseCode: string;
    instructorId: string;
    roomName: string;
    timeslotId: number;
  }[];
  metrics: SolveMetrics;
}

@Injectable()
export class CspService {
  async loadAll() {
    const courseRepo = AppDataSource.getRepository(Course);
    const instrRepo = AppDataSource.getRepository(Instructor);
    const roomRepo = AppDataSource.getRepository(Room);
    const tsRepo = AppDataSource.getRepository(TimeSlot);
    const sectionRepo = AppDataSource.getRepository(Section);

    const [courses, instructors, rooms, timeslots, sections] = await Promise.all([
      courseRepo.find(),
      instrRepo.find(),
      roomRepo.find(),
      tsRepo.find(),
      sectionRepo.find(),
    ]);

    return { courses, instructors, rooms, timeslots, sections };
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

  // Main solver: each section session is a variable
  async solve(): Promise<SolveResult> {
    const startTime = performance.now();

    // PHASE 1: Data Loading
    const dataLoadStart = performance.now();
    const { courses, instructors, rooms, timeslots, sections } = await this.loadAll();
    const dataLoadTimeMs = performance.now() - dataLoadStart;

    // Build a map of course codes to courses for quick lookup
    const courseMap = new Map<string, Course>();
    for (const course of courses) {
      courseMap.set(course.code, course);
    }

    // Build a map for quick section lookup
    const sectionMap = new Map<string, Section>();
    for (const section of sections) {
      sectionMap.set(section.id, section);
    }

    // PHASE 2: Domain Construction
    const domainConstructionStart = performance.now();

    // Create section sessions (each section with its course's sessionsPerWeek creates multiple variables)
    const sectionSessions: SectionSession[] = [];
    for (const section of sections) {
      const course = courseMap.get(section.courseCode);
      if (!course) {
        console.warn(`Section ${section.id} references unknown course ${section.courseCode}`);
        continue;
      }
      const sessionsCount = course.sessionsPerWeek || 1;
      for (let i = 1; i <= sessionsCount; i++) {
        sectionSessions.push({
          sectionId: section.id,
          courseCode: section.courseCode,
          sessionNumber: i,
          section,
          course
        });
      }
    }

    // Metrics tracking
    let fallbackRelaxations = 0;

    // Build domains per section session
    const domains = new Map<string, any[]>();
    for (const session of sectionSessions) {
      const key = `${session.sectionId}_${session.sessionNumber}`;
      const domain = [];

      for (const ts of timeslots) {
        for (const room of rooms) {
          // HARD: room type must be compatible with course type
          if (session.course.type && room.type &&
              !this.roomTypeCompatible(session.course.type, room.type)) continue;

          // HARD: room capacity must accommodate section capacity
          if (room.capacity < session.section.capacity) continue;

          for (const inst of instructors) {
            // HARD: respect instructor day preferences
            if (!this.instructorAllowsTimeslot(inst, ts)) continue;
            domain.push({ timeslot: ts, room, instructor: inst });
          }
        }
      }

      // Fallback: if domain empty, relax instructor preferences
      if (domain.length === 0) {
        fallbackRelaxations++;
        for (const ts of timeslots) {
          for (const room of rooms) {
            if (session.course.type && room.type &&
                !this.roomTypeCompatible(session.course.type, room.type)) continue;
            if (room.capacity < session.section.capacity) continue;
            for (const inst of instructors) {
              domain.push({ timeslot: ts, room, instructor: inst });
            }
          }
        }
      }

      domains.set(key, domain);
    }

    // Calculate domain statistics
    const domainSizes = [...domains.values()].map(d => d.length);
    const minDomainSize = Math.min(...domainSizes);
    const maxDomainSize = Math.max(...domainSizes);
    const averageDomainSize = domainSizes.reduce((a, b) => a + b, 0) / domainSizes.length;

    // Order by smallest domain first (MRV heuristic)
    const order = [...domains.entries()].sort((a, b) => a[1].length - b[1].length);

    const domainConstructionTimeMs = performance.now() - domainConstructionStart;

    // PHASE 3: Backtracking Search
    const searchStart = performance.now();

    const assignment: Assignment[] = [];
    let backtrackCount = 0;

    // Constraint breakdown tracking
    const constraintBreakdown: ConstraintBreakdown = {
      qualifiedInstructorBonus: 0,
      preferredInstructorBonus: 0,
      earlyLateSlotPenalties: 0,
      distantRoomPenalties: 0,
      clusteringPenalties: 0,
      gapPenalties: 0,
    };

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

    // SOFT CONSTRAINT SCORING (lower score = better) - with breakdown tracking
    const scoreCandidate = (session: SectionSession, cand: any, assignment: Assignment[], trackBreakdown = false): number => {
      let score = 0;

      // SOFT: Prefer qualified instructors (strong preference)
      const isQualified = this.instructorQualified(cand.instructor, session.course);
      if (isQualified) {
        score -= 50;
        if (trackBreakdown) constraintBreakdown.qualifiedInstructorBonus++;
      }

      // SOFT: Prefer section's preferred instructor if specified
      const isPreferred = session.section.preferredInstructor &&
          cand.instructor.externalId === session.section.preferredInstructor;
      if (isPreferred) {
        score -= 30;
        if (trackBreakdown) constraintBreakdown.preferredInstructorBonus++;
      }

      // SOFT: Avoid early morning/late evening (use priority field)
      const timePriority = cand.timeslot.priority || 0;
      if (timePriority > 0) {
        score += timePriority * 10;
        if (trackBreakdown) constraintBreakdown.earlyLateSlotPenalties++;
      }

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
      let distancePenalty = 0;
      for (let i = 0; i < instructorPrevAssignments.length; i++) {
        const prev = instructorPrevAssignments[i];
        // If on same day and potentially consecutive slots
        if (prev.timeslot.day === cand.timeslot.day) {
          const distance = this.calculateRoomDistance(prev.room, cand.room);
          distancePenalty += distance * 5; // penalize distant rooms
        }
      }
      if (distancePenalty > 0) {
        score += distancePenalty;
        if (trackBreakdown) constraintBreakdown.distantRoomPenalties += distancePenalty;
      }

      // SOFT: Distribute section sessions evenly across the week
      // Count how many sessions already on this day for this section
      const sectionAssignmentsOnDay = assignment
        .filter(a => a.sectionId === session.sectionId &&
                     a.timeslot.day === cand.timeslot.day)
        .length;
      if (sectionAssignmentsOnDay > 0) {
        score += sectionAssignmentsOnDay * 15; // penalize clustering on same day
        if (trackBreakdown) constraintBreakdown.clusteringPenalties++;
      }

      // SOFT: Try to minimize gaps for students (approximate: prefer consecutive times)
      const sectionAssignments = assignment
        .filter(a => a.sectionId === session.sectionId);

      if (sectionAssignments.length > 0) {
        // Prefer times that are close to existing assignments
        let minGap = Infinity;
        for (const prev of sectionAssignments) {
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
          const gapPenalty = Math.floor(minGap / 60) * 3;
          score += gapPenalty;
          if (trackBreakdown) constraintBreakdown.gapPenalties++;
        }
      }

      return score;
    };

    // Backtracking search
    const backtrack = (index: number): boolean => {
      if (index >= order.length) return true;

      const [key, domain] = order[index];
      if (!domain || domain.length === 0) return false;

      // Parse key to get section session info (format: sectionId_sessionNum)
      const lastUnderscoreIdx = key.lastIndexOf('_');
      const sectionId = key.substring(0, lastUnderscoreIdx);
      const sessionNum = key.substring(lastUnderscoreIdx + 1);
      const section = sectionMap.get(sectionId);
      const course = courseMap.get(section?.courseCode);

      if (!section || !course) return false;

      const session: SectionSession = {
        sectionId,
        courseCode: section.courseCode,
        sessionNumber: parseInt(sessionNum),
        section,
        course
      };

      // Sort domain by soft constraint score (best first)
      const sorted = domain
        .map(d => ({ ...d, score: scoreCandidate(session, d, assignment, false) }))
        .sort((a, b) => a.score - b.score);

      for (const d of sorted) {
        const candidate: Assignment = {
          sectionId,
          courseCode: section.courseCode,
          sessionNumber: session.sessionNumber,
          instructorId: d.instructor.externalId,
          roomName: d.room.name,
          timeslotId: d.timeslot.id,
          instructor: d.instructor,
          room: d.room,
          timeslot: d.timeslot,
          score: d.score
        };

        if (violatesHard(candidate)) continue;

        // Track constraint breakdown for final assignment
        scoreCandidate(session, d, assignment, true);

        assignment.push(candidate);
        if (backtrack(index + 1)) return true;
        assignment.pop();
        backtrackCount++;
      }

      return false;
    };

    const ok = backtrack(0);
    const searchTimeMs = performance.now() - searchStart;

    if (!ok) {
      throw new Error('No feasible assignment found for given data and constraints');
    }

    // Calculate total soft score
    const totalSoftScore = assignment.reduce((sum, a) => sum + (a.score || 0), 0);

    const totalTimeMs = performance.now() - startTime;

    // Build metrics
    const metrics: SolveMetrics = {
      totalTimeMs: Math.round(totalTimeMs * 100) / 100,
      dataLoadTimeMs: Math.round(dataLoadTimeMs * 100) / 100,
      domainConstructionTimeMs: Math.round(domainConstructionTimeMs * 100) / 100,
      searchTimeMs: Math.round(searchTimeMs * 100) / 100,
      backtrackCount,
      fallbackRelaxations,
      totalSoftScore,
      assignmentCount: assignment.length,
      problemSize: {
        totalSections: sections.length,
        totalSectionSessions: sectionSessions.length,
        totalTimeslots: timeslots.length,
        totalRooms: rooms.length,
        totalInstructors: instructors.length,
        averageDomainSize: Math.round(averageDomainSize),
        minDomainSize,
        maxDomainSize,
      },
      constraintBreakdown,
    };

    // Return timetable entries with metrics
    return {
      assignments: assignment.map(a => ({
        sectionId: a.sectionId,
        courseCode: a.courseCode,
        instructorId: a.instructorId,
        roomName: a.roomName,
        timeslotId: a.timeslotId
      })),
      metrics,
    };
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
