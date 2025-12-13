import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { Course } from '../../entities/course.entity';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  async findAll(): Promise<Course[]> {
    return this.coursesService.findAll();
  }

  @Get(':code')
  async findOne(@Param('code') code: string): Promise<Course> {
    return this.coursesService.findOne(code);
  }

  @Post()
  async create(@Body() data: Partial<Course>): Promise<Course> {
    return this.coursesService.create(data);
  }

  @Put(':code')
  async update(@Param('code') code: string, @Body() data: Partial<Course>): Promise<Course> {
    return this.coursesService.update(code, data);
  }

  @Delete(':code')
  async remove(@Param('code') code: string): Promise<{ success: boolean }> {
    await this.coursesService.remove(code);
    return { success: true };
  }
}
