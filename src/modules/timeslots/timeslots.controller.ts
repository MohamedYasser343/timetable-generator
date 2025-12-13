import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { TimeslotsService } from './timeslots.service';
import { TimeSlot } from '../../entities/timeslot.entity';

@Controller('timeslots')
export class TimeslotsController {
  constructor(private readonly timeslotsService: TimeslotsService) {}

  @Get()
  async findAll(): Promise<TimeSlot[]> {
    return this.timeslotsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<TimeSlot> {
    return this.timeslotsService.findOne(id);
  }

  @Post()
  async create(@Body() data: Partial<TimeSlot>): Promise<TimeSlot> {
    return this.timeslotsService.create(data);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<TimeSlot>): Promise<TimeSlot> {
    return this.timeslotsService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.timeslotsService.remove(id);
    return { success: true };
  }
}
