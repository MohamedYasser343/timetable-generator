import { Injectable } from '@nestjs/common';
import { AppDataSource } from '../../../ormconfig';
import { TimetableEntry } from '../../entities/timetable-entry.entity';
import { CspService } from '../csp/csp.service';

@Injectable()
export class TimetableService {
  constructor(private readonly csp: CspService) {}

  async generateAndSave() {
    const repo = AppDataSource.getRepository(TimetableEntry);
    // clear previous
    await repo.clear();

    const solution = await this.csp.solve();

    const entries = solution.map(s => {
      const e = new TimetableEntry();
      e.courseCode = s.courseCode;
      e.instructorId = s.instructorId;
      e.roomName = s.roomName;
      e.timeslotId = s.timeslotId;
      return e;
    });

    await repo.save(entries);
    return entries;
  }

  async getAll() {
    const repo = AppDataSource.getRepository(TimetableEntry);
    return repo.find();
  }
}
