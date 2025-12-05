const API_URL = 'http://localhost:3000';

// Timeslot mapping based on CSV data (1-indexed to match database IDs)
const TIMESLOTS = [
  { id: 1, day: 'Sunday', startTime: '9:00 AM', endTime: '10:30 AM' },
  { id: 2, day: 'Sunday', startTime: '10:45 AM', endTime: '12:15 PM' },
  { id: 3, day: 'Sunday', startTime: '12:30 PM', endTime: '2:00 PM' },
  { id: 4, day: 'Sunday', startTime: '2:15 PM', endTime: '3:45 PM' },
  { id: 5, day: 'Monday', startTime: '9:00 AM', endTime: '10:30 AM' },
  { id: 6, day: 'Monday', startTime: '10:45 AM', endTime: '12:15 PM' },
  { id: 7, day: 'Monday', startTime: '12:30 PM', endTime: '2:00 PM' },
  { id: 8, day: 'Monday', startTime: '2:15 PM', endTime: '3:45 PM' },
  { id: 9, day: 'Tuesday', startTime: '9:00 AM', endTime: '10:30 AM' },
  { id: 10, day: 'Tuesday', startTime: '10:45 AM', endTime: '12:15 PM' },
  { id: 11, day: 'Tuesday', startTime: '12:30 PM', endTime: '2:00 PM' },
  { id: 12, day: 'Tuesday', startTime: '2:15 PM', endTime: '3:45 PM' },
  { id: 13, day: 'Wednesday', startTime: '9:00 AM', endTime: '10:30 AM' },
  { id: 14, day: 'Wednesday', startTime: '10:45 AM', endTime: '12:15 PM' },
  { id: 15, day: 'Wednesday', startTime: '12:30 PM', endTime: '2:00 PM' },
  { id: 16, day: 'Wednesday', startTime: '2:15 PM', endTime: '3:45 PM' },
  { id: 17, day: 'Thursday', startTime: '9:00 AM', endTime: '10:30 AM' },
  { id: 18, day: 'Thursday', startTime: '10:45 AM', endTime: '12:15 PM' },
  { id: 19, day: 'Thursday', startTime: '12:30 PM', endTime: '2:00 PM' },
  { id: 20, day: 'Thursday', startTime: '2:15 PM', endTime: '3:45 PM' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIME_SLOTS_PER_DAY = [
  { startTime: '9:00 AM', endTime: '10:30 AM' },
  { startTime: '10:45 AM', endTime: '12:15 PM' },
  { startTime: '12:30 PM', endTime: '2:00 PM' },
  { startTime: '2:15 PM', endTime: '3:45 PM' },
];

// Color palette for courses
const COLORS = [
  '#4361ee', '#7209b7', '#3a0ca3', '#f72585', '#4cc9f0',
  '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#264653',
  '#023e8a', '#0077b6', '#00b4d8', '#90e0ef', '#6a4c93',
];

let timetableData = [];
let courseColors = {};

// DOM Elements
const calendarBody = document.getElementById('calendarBody');
const legendItems = document.getElementById('legendItems');
const refreshBtn = document.getElementById('refreshBtn');
const filterType = document.getElementById('filterType');
const filterValue = document.getElementById('filterValue');
const tooltip = document.getElementById('tooltip');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  buildCalendarStructure();
  fetchTimetable();

  refreshBtn.addEventListener('click', fetchTimetable);
  filterType.addEventListener('change', handleFilterTypeChange);
  filterValue.addEventListener('change', applyFilter);
});

function buildCalendarStructure() {
  calendarBody.innerHTML = '';

  TIME_SLOTS_PER_DAY.forEach((slot) => {
    // Time column
    const timeCell = document.createElement('div');
    timeCell.className = 'time-slot';
    timeCell.innerHTML = `${slot.startTime}<br>-<br>${slot.endTime}`;
    calendarBody.appendChild(timeCell);

    // Day columns
    DAYS.forEach((day) => {
      const dayCell = document.createElement('div');
      dayCell.className = 'day-cell';
      dayCell.dataset.day = day;
      dayCell.dataset.startTime = slot.startTime;
      calendarBody.appendChild(dayCell);
    });
  });
}

async function fetchTimetable() {
  try {
    calendarBody.innerHTML = '<div class="loading" style="grid-column: 1 / -1;">Loading timetable...</div>';

    const response = await fetch(`${API_URL}/timetable`);
    if (!response.ok) throw new Error('Failed to fetch timetable');

    timetableData = await response.json();
    assignCourseColors();
    buildCalendarStructure();
    renderTimetable(timetableData);
    updateFilters();
    renderLegend();
  } catch (error) {
    calendarBody.innerHTML = `<div class="error" style="grid-column: 1 / -1;">Error: ${error.message}</div>`;
    console.error('Error fetching timetable:', error);
  }
}

function assignCourseColors() {
  const courses = [...new Set(timetableData.map((e) => e.courseCode))];
  courseColors = {};
  courses.forEach((course, index) => {
    courseColors[course] = COLORS[index % COLORS.length];
  });
}

function getTimeslotInfo(timeslotId) {
  return TIMESLOTS.find((ts) => ts.id === timeslotId);
}

function renderTimetable(data) {
  // Clear existing events
  document.querySelectorAll('.day-cell').forEach((cell) => {
    cell.innerHTML = '';
  });

  data.forEach((entry) => {
    const timeslot = getTimeslotInfo(entry.timeslotId);
    if (!timeslot) return;

    const cell = document.querySelector(
      `.day-cell[data-day="${timeslot.day}"][data-start-time="${timeslot.startTime}"]`
    );
    if (!cell) return;

    const event = document.createElement('div');
    event.className = 'event';
    event.style.backgroundColor = courseColors[entry.courseCode];
    event.innerHTML = `
      <div class="course-code">${entry.courseCode}</div>
      <div class="event-details">
        ${entry.roomName}<br>
        ${entry.instructorId}
      </div>
    `;

    event.addEventListener('mouseenter', (e) => showTooltip(e, entry, timeslot));
    event.addEventListener('mouseleave', hideTooltip);
    event.addEventListener('mousemove', moveTooltip);

    cell.appendChild(event);
  });
}

function showTooltip(e, entry, timeslot) {
  tooltip.innerHTML = `
    <div class="tooltip-row">
      <div class="tooltip-label">Course</div>
      <div>${entry.courseCode}</div>
    </div>
    <div class="tooltip-row">
      <div class="tooltip-label">Instructor</div>
      <div>${entry.instructorId}</div>
    </div>
    <div class="tooltip-row">
      <div class="tooltip-label">Room</div>
      <div>${entry.roomName}</div>
    </div>
    <div class="tooltip-row">
      <div class="tooltip-label">Day</div>
      <div>${timeslot.day}</div>
    </div>
    <div class="tooltip-row">
      <div class="tooltip-label">Time</div>
      <div>${timeslot.startTime} - ${timeslot.endTime}</div>
    </div>
  `;
  tooltip.classList.add('visible');
  moveTooltip(e);
}

function moveTooltip(e) {
  const x = e.clientX + 15;
  const y = e.clientY + 15;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

function updateFilters() {
  const instructors = [...new Set(timetableData.map((e) => e.instructorId))].sort();
  const rooms = [...new Set(timetableData.map((e) => e.roomName))].sort();
  const courses = [...new Set(timetableData.map((e) => e.courseCode))].sort();

  filterValue.filterData = { instructors, rooms, courses };
}

function handleFilterTypeChange() {
  const type = filterType.value;
  filterValue.innerHTML = '';

  if (type === 'all') {
    filterValue.disabled = true;
    filterValue.innerHTML = '<option value="">Select filter first</option>';
    renderTimetable(timetableData);
    return;
  }

  filterValue.disabled = false;
  const data = filterValue.filterData;
  let options = [];

  switch (type) {
    case 'instructor':
      options = data.instructors;
      break;
    case 'room':
      options = data.rooms;
      break;
    case 'course':
      options = data.courses;
      break;
  }

  filterValue.innerHTML = '<option value="">All</option>';
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    filterValue.appendChild(option);
  });
}

function applyFilter() {
  const type = filterType.value;
  const value = filterValue.value;

  if (!value || type === 'all') {
    renderTimetable(timetableData);
    return;
  }

  let filtered;
  switch (type) {
    case 'instructor':
      filtered = timetableData.filter((e) => e.instructorId === value);
      break;
    case 'room':
      filtered = timetableData.filter((e) => e.roomName === value);
      break;
    case 'course':
      filtered = timetableData.filter((e) => e.courseCode === value);
      break;
    default:
      filtered = timetableData;
  }

  renderTimetable(filtered);
}

function renderLegend() {
  legendItems.innerHTML = '';
  Object.entries(courseColors).forEach(([course, color]) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <div class="legend-color" style="background: ${color}"></div>
      <span>${course}</span>
    `;
    legendItems.appendChild(item);
  });
}
