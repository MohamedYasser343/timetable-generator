import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Section {
  @PrimaryColumn()
  id: string; // e.g., "CSC111-A" or "CSC111-1"

  @Column()
  courseCode: string; // FK to Course.code

  @Column()
  sectionName: string; // e.g., "A", "B", "1", "2"

  @Column('int', { default: 30 })
  capacity: number; // max students in this section

  @Column({ nullable: true })
  preferredInstructor: string; // optional: preferred instructor ID
}
