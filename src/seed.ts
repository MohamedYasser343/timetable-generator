import { AppDataSource } from '../ormconfig';
import { Course } from './entities/course.entity';
import { Instructor } from './entities/instructor.entity';
import { Room } from './entities/room.entity';
import { TimeSlot } from './entities/timeslot.entity';
import { Section } from './entities/section.entity';
import { Lecture } from './entities/lecture.entity';

async function seed() {
  await AppDataSource.initialize();

  const courseRepo = AppDataSource.getRepository(Course);
  const instructorRepo = AppDataSource.getRepository(Instructor);
  const roomRepo = AppDataSource.getRepository(Room);
  const timeslotRepo = AppDataSource.getRepository(TimeSlot);
  const sectionRepo = AppDataSource.getRepository(Section);
  const lectureRepo = AppDataSource.getRepository(Lecture);

  await courseRepo.clear();
  await instructorRepo.clear();
  await roomRepo.clear();
  await timeslotRepo.clear();
  await sectionRepo.clear();
  await lectureRepo.clear();

  await courseRepo.save([
    { code: 'CS101', name: 'Intro to CS', credits: 3, type: 'LECTURE' } as Partial<Course>,
    { code: 'CS102', name: 'Programming Lab', credits: 1, type: 'LAB' } as Partial<Course>,
    { code: 'CS201', name: 'Data Structures', credits: 3, type: 'LECTURE' } as Partial<Course>
  ]);

  await instructorRepo.save([
    { name: 'Dr. A', qualifiedCourses: 'CS101,CS201' } as Partial<Instructor>,
    { name: 'Dr. B', qualifiedCourses: 'CS102' } as Partial<Instructor>,
    { name: 'Dr. C', qualifiedCourses: 'CS101,CS102,CS201' } as Partial<Instructor>,
  ]);

  await roomRepo.save([
    { name: 'Room101', type: 'LECTURE', capacity: 50 } as Partial<Room>,
    { name: 'Lab1', type: 'LAB', capacity: 30 } as Partial<Room>,
    { name: 'Room102', type: 'LECTURE', capacity: 40 } as Partial<Room>
  ]);

  await timeslotRepo.save([
    { day: 'Mon', startTime: '08:30', endTime: '10:00' } as Partial<TimeSlot>,
    { day: 'Mon', startTime: '10:15', endTime: '11:45' } as Partial<TimeSlot>,
    { day: 'Tue', startTime: '08:30', endTime: '10:00' } as Partial<TimeSlot>,
    { day: 'Tue', startTime: '10:15', endTime: '11:45' } as Partial<TimeSlot>,
    { day: 'Wed', startTime: '08:30', endTime: '10:00' } as Partial<TimeSlot>
  ]);

  await sectionRepo.save([
    { name: 'Level1-A', semester: 1, studentCount: 40 },
    { name: 'Level1-B', semester: 1, studentCount: 30 }
  ]);

  // lectures (one per course per section as sample)
  await lectureRepo.save([
    { courseCode: 'CS101', sectionName: 'Level1-A', hoursPerWeek: 3, type: 'LECTURE' },
    { courseCode: 'CS102', sectionName: 'Level1-A', hoursPerWeek: 2, type: 'LAB' },
    { courseCode: 'CS201', sectionName: 'Level1-B', hoursPerWeek: 3, type: 'LECTURE' }
  ]);

  console.log('Seed done');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
