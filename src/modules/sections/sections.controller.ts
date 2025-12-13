import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { SectionsService } from './sections.service';
import { Section } from '../../entities/section.entity';

@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  async findAll(): Promise<Section[]> {
    return this.sectionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Section> {
    return this.sectionsService.findOne(id);
  }

  @Post()
  async create(@Body() data: Partial<Section>): Promise<Section> {
    return this.sectionsService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Section>): Promise<Section> {
    return this.sectionsService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.sectionsService.remove(id);
    return { success: true };
  }
}
