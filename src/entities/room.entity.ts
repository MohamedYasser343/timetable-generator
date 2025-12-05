import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Room {
  @PrimaryColumn()
  name: string; // RoomID like R101

  @Column()
  type: string;

  @Column('int')
  capacity: number;

  @Column({ nullable: true })
  building: string; // e.g., "A", "B", "Main"

  @Column('int', { nullable: true })
  floor: number; // for distance calculations
}
