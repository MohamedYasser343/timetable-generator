import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { InstructorsService } from './instructors.service';
import { Instructor } from '../../entities/instructor.entity';

@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Get()
  async findAll(): Promise<Instructor[]> {
    return this.instructorsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Instructor> {
    return this.instructorsService.findOne(id);
  }

  @Post()
  async create(@Body() data: Partial<Instructor>): Promise<Instructor> {
    return this.instructorsService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Instructor>): Promise<Instructor> {
    return this.instructorsService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.instructorsService.remove(id);
    return { success: true };
  }
}
