import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { TimetableEntry } from '../../entities/timetable-entry.entity';
import { CspService, SolveMetrics } from '../csp/csp.service';

export interface GenerateResult {
  entries: TimetableEntry[];
  metrics: SolveMetrics;
}

@Injectable()
export class TimetableService {
  constructor(private readonly csp: CspService) {}

  async generateAndSave(): Promise<GenerateResult> {
    const repo = AppDataSource.getRepository(TimetableEntry);
    // clear previous
    await repo.clear();

    const result = await this.csp.solve();

    const entries = result.assignments.map(s => {
      const e = new TimetableEntry();
      e.sectionId = s.sectionId;
      e.courseCode = s.courseCode;
      e.instructorId = s.instructorId;
      e.roomName = s.roomName;
      e.timeslotId = s.timeslotId;
      return e;
    });

    await repo.save(entries);
    return { entries, metrics: result.metrics };
  }

  async getAll() {
    const repo = AppDataSource.getRepository(TimetableEntry);
    return repo.find();
  }
}
