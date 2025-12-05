import { AppDataSource } from '../ormconfig';
import { Course } from './entities/course.entity';
import { Instructor } from './entities/instructor.entity';
import { Room } from './entities/room.entity';
import { TimeSlot } from './entities/timeslot.entity';

async function run() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

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

  console.log('Courses:', courses.length);
  console.log('Instructors:', instructors.length);
  console.log('Rooms:', rooms.length);
  console.log('Timeslots:', timeslots.length);

  console.log('\nSample course:', courses[0]);
  console.log('\nSample instructor:', instructors[0]);
  console.log('\nSample room:', rooms[0]);
  console.log('\nSample timeslot:', timeslots[0]);

  // Calculate total sessions needed
  const totalSessions = courses.reduce((sum, c) => sum + (c.sessionsPerWeek || 1), 0);
  const totalSlots = rooms.length * timeslots.length;

  console.log('\n=== Capacity Analysis ===');
  console.log('Total sessions needed:', totalSessions);
  console.log('Total slot capacity:', totalSlots);
  console.log('Utilization:', ((totalSessions / totalSlots) * 100).toFixed(2) + '%');

  // Check room types
  const roomTypes = new Map<string, number>();
  rooms.forEach(r => {
    const count = roomTypes.get(r.type) || 0;
    roomTypes.set(r.type, count + 1);
  });
  console.log('\nRoom types:', Object.fromEntries(roomTypes));

  // Check course types
  const courseTypes = new Map<string, number>();
  courses.forEach(c => {
    const count = courseTypes.get(c.type) || 0;
    courseTypes.set(c.type, count + 1);
  });
  console.log('Course types:', Object.fromEntries(courseTypes));

  await AppDataSource.destroy();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
