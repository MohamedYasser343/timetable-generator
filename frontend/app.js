const API_URL = 'http://localhost:3000';

// These will be populated from the API
let TIMESLOTS = [];
let DAYS = [];
let TIME_SLOTS_PER_DAY = [];

// Color palette for courses
const COLORS = [
  '#4361ee', '#7209b7', '#3a0ca3', '#f72585', '#4cc9f0',
  '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#264653',
  '#023e8a', '#0077b6', '#00b4d8', '#90e0ef', '#6a4c93',
];

let timetableData = [];
let courseColors = {};
let currentTab = 'courses';
let editingEntity = null;

// DOM Elements
const calendarBody = document.getElementById('calendarBody');
const legendItems = document.getElementById('legendItems');
const refreshBtn = document.getElementById('refreshBtn');
const generateBtn = document.getElementById('generateBtn');
const manageDataBtn = document.getElementById('manageDataBtn');
const filterType = document.getElementById('filterType');
const filterValue = document.getElementById('filterValue');
const tooltip = document.getElementById('tooltip');
const metricsPanel = document.getElementById('metricsPanel');
const closeMetrics = document.getElementById('closeMetrics');
const modalOverlay = document.getElementById('modalOverlay');
const closeModal = document.getElementById('closeModal');
const modalContent = document.getElementById('modalContent');
const entityModalOverlay = document.getElementById('entityModalOverlay');
const closeEntityModal = document.getElementById('closeEntityModal');
const cancelEntity = document.getElementById('cancelEntity');
const saveEntity = document.getElementById('saveEntity');
const entityForm = document.getElementById('entityForm');
const entityModalTitle = document.getElementById('entityModalTitle');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // First fetch timeslots to build the calendar structure
  await fetchTimeslots();
  buildCalendarStructure();
  fetchTimetable();

  refreshBtn.addEventListener('click', fetchTimetable);
  generateBtn.addEventListener('click', generateTimetable);
  manageDataBtn.addEventListener('click', openDataModal);
  filterType.addEventListener('change', handleFilterTypeChange);
  filterValue.addEventListener('change', applyFilter);
  closeMetrics.addEventListener('click', () => metricsPanel.style.display = 'none');
  closeModal.addEventListener('click', closeDataModal);
  closeEntityModal.addEventListener('click', closeEntityModalFn);
  cancelEntity.addEventListener('click', closeEntityModalFn);
  saveEntity.addEventListener('click', handleSaveEntity);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeDataModal(); });
  entityModalOverlay.addEventListener('click', (e) => { if (e.target === entityModalOverlay) closeEntityModalFn(); });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

async function fetchTimeslots() {
  try {
    const response = await fetch(`${API_URL}/timeslots`);
    if (!response.ok) throw new Error('Failed to fetch timeslots');

    TIMESLOTS = await response.json();

    // Extract unique days in order
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    DAYS = [...new Set(TIMESLOTS.map(ts => ts.day))].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

    // Extract unique time slots (use first day's slots as template)
    const firstDaySlots = TIMESLOTS.filter(ts => ts.day === DAYS[0]);
    TIME_SLOTS_PER_DAY = firstDaySlots.map(ts => ({
      startTime: ts.startTime,
      endTime: ts.endTime
    }));

    // Update calendar header with dynamic days
    updateCalendarHeader();
  } catch (error) {
    console.error('Error fetching timeslots:', error);
    // Fallback to empty arrays - calendar will be empty
  }
}

function updateCalendarHeader() {
  // Set CSS variable for dynamic column count
  document.documentElement.style.setProperty('--days-count', DAYS.length);

  const headerContainer = document.querySelector('.calendar-header');
  headerContainer.innerHTML = '<div class="time-column-header">Time</div>';
  DAYS.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = day;
    headerContainer.appendChild(dayHeader);
  });
}

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

// ===== GENERATE TIMETABLE =====
async function generateTimetable() {
  try {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span>Generating...';

    const response = await fetch(`${API_URL}/timetable/generate`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to generate timetable');

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Generation failed');

    timetableData = result.entries;
    assignCourseColors();
    buildCalendarStructure();
    renderTimetable(timetableData);
    updateFilters();
    renderLegend();

    // Show metrics panel
    if (result.metrics) {
      displayMetrics(result.metrics);
      metricsPanel.style.display = 'block';
    }
  } catch (error) {
    alert('Error: ' + error.message);
    console.error('Error generating timetable:', error);
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = 'Generate Timetable';
  }
}

function displayMetrics(metrics) {
  document.getElementById('metricTotalTime').textContent = metrics.totalTimeMs + ' ms';
  document.getElementById('metricDataLoad').textContent = metrics.dataLoadTimeMs + ' ms';
  document.getElementById('metricDomainConstruction').textContent = metrics.domainConstructionTimeMs + ' ms';
  document.getElementById('metricSearchTime').textContent = metrics.searchTimeMs + ' ms';

  document.getElementById('metricSections').textContent = metrics.problemSize.totalSections;
  document.getElementById('metricSessions').textContent = metrics.problemSize.totalSectionSessions;
  document.getElementById('metricTimeslots').textContent = metrics.problemSize.totalTimeslots;
  document.getElementById('metricRooms').textContent = metrics.problemSize.totalRooms;
  document.getElementById('metricInstructors').textContent = metrics.problemSize.totalInstructors;
  document.getElementById('metricAvgDomain').textContent = metrics.problemSize.averageDomainSize;

  document.getElementById('metricTotalScore').textContent = metrics.totalSoftScore;
  document.getElementById('metricAssignments').textContent = metrics.assignmentCount;
  document.getElementById('metricBacktracks').textContent = metrics.backtrackCount;
  document.getElementById('metricFallbacks').textContent = metrics.fallbackRelaxations;

  document.getElementById('metricQualified').textContent = metrics.constraintBreakdown.qualifiedInstructorBonus;
  document.getElementById('metricPreferred').textContent = metrics.constraintBreakdown.preferredInstructorBonus;
  document.getElementById('metricEarlyLate').textContent = metrics.constraintBreakdown.earlyLateSlotPenalties;
  document.getElementById('metricDistant').textContent = metrics.constraintBreakdown.distantRoomPenalties;
  document.getElementById('metricClustering').textContent = metrics.constraintBreakdown.clusteringPenalties;
  document.getElementById('metricGaps').textContent = metrics.constraintBreakdown.gapPenalties;
}

// ===== DATA MANAGEMENT MODAL =====
function openDataModal() {
  modalOverlay.classList.add('visible');
  loadTabData('courses');
}

function closeDataModal() {
  modalOverlay.classList.remove('visible');
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  loadTabData(tab);
}

async function loadTabData(tab) {
  modalContent.innerHTML = '<div class="loading">Loading...</div>';
  try {
    const response = await fetch(`${API_URL}/${tab}`);
    if (!response.ok) throw new Error('Failed to load data');
    const data = await response.json();
    renderDataTable(tab, data);
  } catch (error) {
    modalContent.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  }
}

function renderDataTable(tab, data) {
  const config = getTableConfig(tab);
  let html = `
    <button class="add-btn" onclick="openEntityModal('${tab}', null)">+ Add ${config.singular}</button>
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            ${config.columns.map(col => `<th>${col.label}</th>`).join('')}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    html += '<tr>';
    config.columns.forEach(col => {
      html += `<td>${item[col.key] ?? '-'}</td>`;
    });
    html += `
      <td class="actions">
        <button class="btn-edit" onclick="openEntityModal('${tab}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">Edit</button>
        <button class="btn-delete" onclick="deleteEntity('${tab}', '${item[config.idKey]}')">Delete</button>
      </td>
    </tr>`;
  });

  html += '</tbody></table></div>';
  modalContent.innerHTML = html;
}

function getTableConfig(tab) {
  const configs = {
    courses: {
      singular: 'Course',
      idKey: 'code',
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'credits', label: 'Credits' },
        { key: 'type', label: 'Type' },
        { key: 'sessionsPerWeek', label: 'Sessions/Week' }
      ],
      fields: [
        { key: 'code', label: 'Course Code', type: 'text', required: true },
        { key: 'name', label: 'Course Name', type: 'text', required: true },
        { key: 'credits', label: 'Credits', type: 'number', required: true },
        { key: 'type', label: 'Type', type: 'select', options: ['LECTURE', 'LAB', 'LECTURE AND LAB'], required: true },
        { key: 'sessionsPerWeek', label: 'Sessions Per Week', type: 'number', required: true }
      ]
    },
    instructors: {
      singular: 'Instructor',
      idKey: 'externalId',
      columns: [
        { key: 'externalId', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'preferredSlots', label: 'Preferences' },
        { key: 'qualifiedCourses', label: 'Qualified Courses' }
      ],
      fields: [
        { key: 'externalId', label: 'Instructor ID', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'preferredSlots', label: 'Preferences (e.g., "Not on Sunday")', type: 'text' },
        { key: 'qualifiedCourses', label: 'Qualified Courses (comma-separated)', type: 'text' }
      ]
    },
    rooms: {
      singular: 'Room',
      idKey: 'name',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'building', label: 'Building' },
        { key: 'floor', label: 'Floor' }
      ],
      fields: [
        { key: 'name', label: 'Room Name', type: 'text', required: true },
        { key: 'type', label: 'Type', type: 'select', options: ['LECTURE', 'LAB'], required: true },
        { key: 'capacity', label: 'Capacity', type: 'number', required: true },
        { key: 'building', label: 'Building', type: 'text' },
        { key: 'floor', label: 'Floor', type: 'number' }
      ]
    },
    timeslots: {
      singular: 'Time Slot',
      idKey: 'id',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'day', label: 'Day' },
        { key: 'startTime', label: 'Start Time' },
        { key: 'endTime', label: 'End Time' },
        { key: 'priority', label: 'Priority' }
      ],
      fields: [
        { key: 'day', label: 'Day', type: 'select', options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], required: true },
        { key: 'startTime', label: 'Start Time (e.g., "9:00 AM")', type: 'text', required: true },
        { key: 'endTime', label: 'End Time (e.g., "10:30 AM")', type: 'text', required: true },
        { key: 'priority', label: 'Priority (0=normal, 1=early, 2=late)', type: 'number', required: true }
      ]
    },
    sections: {
      singular: 'Section',
      idKey: 'id',
      columns: [
        { key: 'id', label: 'Section ID' },
        { key: 'courseCode', label: 'Course Code' },
        { key: 'sectionName', label: 'Section Name' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'preferredInstructor', label: 'Preferred Instructor' }
      ],
      fields: [
        { key: 'id', label: 'Section ID (e.g., "CSC111-A")', type: 'text', required: true },
        { key: 'courseCode', label: 'Course Code', type: 'text', required: true },
        { key: 'sectionName', label: 'Section Name (e.g., "A")', type: 'text', required: true },
        { key: 'capacity', label: 'Capacity', type: 'number', required: true },
        { key: 'preferredInstructor', label: 'Preferred Instructor ID', type: 'text' }
      ]
    }
  };
  return configs[tab];
}

// ===== ENTITY MODAL =====
function openEntityModal(tab, entity) {
  editingEntity = { tab, entity, isNew: !entity };
  const config = getTableConfig(tab);
  entityModalTitle.textContent = entity ? `Edit ${config.singular}` : `Add ${config.singular}`;

  let html = '';
  config.fields.forEach(field => {
    const value = entity ? (entity[field.key] ?? '') : '';
    const disabled = entity && field.key === config.idKey ? 'disabled' : '';

    if (field.type === 'select') {
      html += `
        <div class="form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          <select name="${field.key}" ${field.required ? 'required' : ''} ${disabled}>
            <option value="">Select...</option>
            ${field.options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </div>
      `;
    } else {
      html += `
        <div class="form-group">
          <label>${field.label}${field.required ? ' *' : ''}</label>
          <input type="${field.type}" name="${field.key}" value="${value}" ${field.required ? 'required' : ''} ${disabled}>
        </div>
      `;
    }
  });

  entityForm.innerHTML = html;
  entityModalOverlay.classList.add('visible');
}

function closeEntityModalFn() {
  entityModalOverlay.classList.remove('visible');
  editingEntity = null;
}

async function handleSaveEntity() {
  if (!editingEntity) return;

  const formData = new FormData(entityForm);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  // Convert number fields
  const config = getTableConfig(editingEntity.tab);
  config.fields.forEach(field => {
    if (field.type === 'number' && data[field.key]) {
      data[field.key] = parseInt(data[field.key], 10);
    }
  });

  try {
    saveEntity.disabled = true;
    saveEntity.innerHTML = '<span class="spinner"></span>Saving...';

    const url = editingEntity.isNew
      ? `${API_URL}/${editingEntity.tab}`
      : `${API_URL}/${editingEntity.tab}/${editingEntity.entity[config.idKey]}`;

    const method = editingEntity.isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to save');

    closeEntityModalFn();
    loadTabData(editingEntity.tab);
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    saveEntity.disabled = false;
    saveEntity.innerHTML = 'Save';
  }
}

async function deleteEntity(tab, id) {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    const response = await fetch(`${API_URL}/${tab}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete');
    loadTabData(tab);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
