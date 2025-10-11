import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Instructor {
  @PrimaryColumn()
  externalId: string; // InstructorID like PROF01

  @Column()
  name: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  preferredSlots: string; // raw string like "Not on Sunday"

  @Column({ nullable: true })
  qualifiedCourses: string; // CSV string of course codes
}
