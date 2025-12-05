import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  day: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column('int', { default: 0 })
  priority: number; // Lower is better: 0=normal, 1=early morning, 2=late evening
}
