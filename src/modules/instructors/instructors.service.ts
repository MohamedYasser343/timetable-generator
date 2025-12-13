import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { Instructor } from '../../entities/instructor.entity';

@Injectable()
export class InstructorsService {
  private get repo() {
    return AppDataSource.getRepository(Instructor);
  }

  async findAll(): Promise<Instructor[]> {
    return this.repo.find();
  }

  async findOne(externalId: string): Promise<Instructor> {
    const instructor = await this.repo.findOne({ where: { externalId } });
    if (!instructor) {
      throw new NotFoundException(`Instructor ${externalId} not found`);
    }
    return instructor;
  }

  async create(data: Partial<Instructor>): Promise<Instructor> {
    const instructor = this.repo.create(data);
    return this.repo.save(instructor);
  }

  async update(externalId: string, data: Partial<Instructor>): Promise<Instructor> {
    const instructor = await this.findOne(externalId);
    Object.assign(instructor, data);
    return this.repo.save(instructor);
  }

  async remove(externalId: string): Promise<void> {
    const instructor = await this.findOne(externalId);
    await this.repo.remove(instructor);
  }
}
