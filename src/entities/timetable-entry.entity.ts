import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TimetableEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sectionId: string; // e.g., "CSC111-A"

  @Column()
  courseCode: string;

  @Column()
  instructorId: string;

  @Column()
  roomName: string;

  @Column()
  timeslotId: number;
}
