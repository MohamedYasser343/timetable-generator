import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Course {
  @PrimaryColumn()
  code: string; // CourseID

  @Column()
  name: string;

  @Column('int')
  credits: number;

  @Column()
  type: string; // LECTURE / LAB
}
