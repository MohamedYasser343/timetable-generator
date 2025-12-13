import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { Course } from '../../entities/course.entity';

@Injectable()
export class CoursesService {
  private get repo() {
    return AppDataSource.getRepository(Course);
  }

  async findAll(): Promise<Course[]> {
    return this.repo.find();
  }

  async findOne(code: string): Promise<Course> {
    const course = await this.repo.findOne({ where: { code } });
    if (!course) {
      throw new NotFoundException(`Course ${code} not found`);
    }
    return course;
  }

  async create(data: Partial<Course>): Promise<Course> {
    const course = this.repo.create(data);
    return this.repo.save(course);
  }

  async update(code: string, data: Partial<Course>): Promise<Course> {
    const course = await this.findOne(code);
    Object.assign(course, data);
    return this.repo.save(course);
  }

  async remove(code: string): Promise<void> {
    const course = await this.findOne(code);
    await this.repo.remove(course);
  }
}
