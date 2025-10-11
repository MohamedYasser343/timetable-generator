import { Controller, Post, Get } from '@nestjs/common';
import { TimetableService } from './timetable.service';

@Controller('timetable')
export class TimetableController {
  constructor(private readonly svc: TimetableService) {}

  @Post('generate')
  async generate() {
    try {
      const entries = await this.svc.generateAndSave();
      return { success: true, count: entries.length, entries };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @Get()
  async getAll() {
    return this.svc.getAll();
  }
}
