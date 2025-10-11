import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Room {
  @PrimaryColumn()
  name: string; // RoomID like R101

  @Column()
  type: string;

  @Column('int')
  capacity: number;
}
