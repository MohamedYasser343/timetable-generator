import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { TimeSlot } from '../../entities/timeslot.entity';

@Injectable()
export class TimeslotsService {
  private get repo() {
    return AppDataSource.getRepository(TimeSlot);
  }

  async findAll(): Promise<TimeSlot[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<TimeSlot> {
    const timeslot = await this.repo.findOne({ where: { id } });
    if (!timeslot) {
      throw new NotFoundException(`TimeSlot ${id} not found`);
    }
    return timeslot;
  }

  async create(data: Partial<TimeSlot>): Promise<TimeSlot> {
    const timeslot = this.repo.create(data);
    return this.repo.save(timeslot);
  }

  async update(id: number, data: Partial<TimeSlot>): Promise<TimeSlot> {
    const timeslot = await this.findOne(id);
    Object.assign(timeslot, data);
    return this.repo.save(timeslot);
  }

  async remove(id: number): Promise<void> {
    const timeslot = await this.findOne(id);
    await this.repo.remove(timeslot);
  }
}
