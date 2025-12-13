import { Controller, Post, Get } from '@nestjs/common';
import { TimetableService } from './timetable.service';

@Controller('timetable')
export class TimetableController {
  constructor(private readonly svc: TimetableService) {}

  @Post('generate')
  async generate() {
    try {
      const result = await this.svc.generateAndSave();
      return {
        success: true,
        count: result.entries.length,
        entries: result.entries,
        metrics: result.metrics
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  @Get()
  async getAll() {
    return this.svc.getAll();
  }
}
