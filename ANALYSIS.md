# Analysis: Project vs Requirements Document

## CSP Formulation

| Requirement | Status | Implementation Details |
|-------------|--------|------------------------|
| **Variables** = Lecture/class sessions | ✅ Implemented | Each `CourseSession` represents a variable (`courseCode + sessionNumber`) in `csp.service.ts:9-13` |
| **Domains** = time slots × rooms × instructors | ✅ Implemented | Built in `csp.service.ts:114-148` |

---

## Hard Constraints

| Constraint | Status | Implementation |
|------------|--------|----------------|
| No professor teaches multiple classes at same time | ✅ Implemented | `csp.service.ts:158-160` - `violatesHard()` checks instructor+timeslot collision |
| No room hosts multiple classes at same time | ✅ Implemented | `csp.service.ts:162-164` - `violatesHard()` checks room+timeslot collision |
| Each course must have all required lectures per week | ✅ Implemented | `csp.service.ts:101-112` - Creates `sessionsPerWeek` variables per course |
| Room type must match course type (lab→practical, classroom→lecture) | ✅ Implemented | `csp.service.ts:82-95` - `roomTypeCompatible()` method handles exact matches and "LECTURE AND LAB" |

---

## Soft Constraints

| Constraint | Status | Implementation |
|------------|--------|----------------|
| Avoid gaps for students | ✅ Implemented | `csp.service.ts:210-231` - Penalizes gaps > 1 hour between same-course sessions |
| Avoid early morning or late evening slots | ✅ Implemented | `csp.service.ts:178-179` - Uses `TimeSlot.priority` field |
| Avoid consecutive distant rooms for same instructor | ✅ Implemented | `csp.service.ts:181-199` - Uses `calculateRoomDistance()` |
| Distribute classes evenly across the week | ✅ Implemented | `csp.service.ts:202-208` - Penalizes clustering on same day |

---

## Dataset Requirements

| Required Table | Status | Fields Comparison |
|----------------|--------|-------------------|
| **Courses** | ✅ Present | `CourseID` ✅, `CourseName` ✅, `Credits` ✅, `Type` ✅ |
| **Instructors** | ✅ Present | `InstructorID` ✅, `Name` ✅, `PreferredSlots` ✅, `QualifiedCourses` ✅ |
| **Rooms** | ✅ Present | `RoomID` ✅, `Type` ✅, `Capacity` ✅ |
| **TimeSlots** | ✅ Present | `Day` ✅, `StartTime` ✅, `EndTime` ✅ |
| **Sections** | ❌ Missing | `SectionID`, `Semester`, `StudentCount` - **NOT IMPLEMENTED** |

---

## Other Requirements

| Requirement | Status | Details |
|-------------|--------|---------|
| Dynamic dataset (DB or Excel) | ✅ Implemented | SQLite + CSV import via `npm run import:csv` |
| User interface to update data and regenerate timetables | ⚠️ Partial | Frontend can **view** and **filter** timetables, but **cannot update data** |
| Evaluate performance | ❌ Missing | No metrics for constraint violations or generation time |
| Data from CSIT Level 1,2,3,4 | ✅ Present | CSV files contain actual CSIT course data |

---

## Algorithm Details

| Technique | Status | Location |
|-----------|--------|----------|
| **MRV Heuristic** (Minimum Remaining Values) | ✅ Implemented | `csp.service.ts:150-151` |
| **Least Constraining Value** (soft constraint scoring) | ✅ Implemented | `csp.service.ts:266-268` |
| **Backtracking Search** | ✅ Implemented | `csp.service.ts:249-290` |

---

## Summary

### What's Implemented Well:

1. All 4 hard constraints
2. All 4 soft constraints
3. CSP formulation (variables, domains, constraints)
4. Dynamic data from SQLite + CSV
5. MRV and LCV heuristics with backtracking
6. Frontend calendar view with filtering

### What's Missing:

1. **Sections entity** - The requirements mention `Sections (SectionID, Semester, StudentCount)` but this is not implemented. The current system assigns all courses without considering sections or student count.

2. **UI for data updates** - The frontend only views data; cannot add/edit courses, instructors, rooms, or time slots.

3. **Performance evaluation** - No metrics displayed for:
   - Number of constraint violations
   - Generation time
   - Solution quality score

4. **Room building/floor data in CSV** - The `rooms.csv` doesn't include `Building` and `Floor` columns, yet the code expects them for distance calculations. The soft constraint for avoiding distant rooms partially works but lacks actual data.

5. **TimeSlot priority in CSV** - The `timeSlots.csv` doesn't include a `Priority` column. The code uses a default of 0 for all slots, so the "avoid early morning/late evening" constraint doesn't differentiate.
