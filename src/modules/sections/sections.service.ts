import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { Section } from '../../entities/section.entity';

@Injectable()
export class SectionsService {
  private get repo() {
    return AppDataSource.getRepository(Section);
  }

  async findAll(): Promise<Section[]> {
    return this.repo.find();
  }

  async findOne(id: string): Promise<Section> {
    const section = await this.repo.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundException(`Section ${id} not found`);
    }
    return section;
  }

  async create(data: Partial<Section>): Promise<Section> {
    const section = this.repo.create(data);
    return this.repo.save(section);
  }

  async update(id: string, data: Partial<Section>): Promise<Section> {
    const section = await this.findOne(id);
    Object.assign(section, data);
    return this.repo.save(section);
  }

  async remove(id: string): Promise<void> {
    const section = await this.findOne(id);
    await this.repo.remove(section);
  }
}
