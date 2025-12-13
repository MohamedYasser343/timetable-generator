import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { Room } from '../../entities/room.entity';

@Injectable()
export class RoomsService {
  private get repo() {
    return AppDataSource.getRepository(Room);
  }

  async findAll(): Promise<Room[]> {
    return this.repo.find();
  }

  async findOne(name: string): Promise<Room> {
    const room = await this.repo.findOne({ where: { name } });
    if (!room) {
      throw new NotFoundException(`Room ${name} not found`);
    }
    return room;
  }

  async create(data: Partial<Room>): Promise<Room> {
    const room = this.repo.create(data);
    return this.repo.save(room);
  }

  async update(name: string, data: Partial<Room>): Promise<Room> {
    const room = await this.findOne(name);
    Object.assign(room, data);
    return this.repo.save(room);
  }

  async remove(name: string): Promise<void> {
    const room = await this.findOne(name);
    await this.repo.remove(room);
  }
}
