const names = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

const shortNames = [
  'Dom',
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb'
];

const VISIBLE_START = 0;
const VISIBLE_END = 24 * 60;
const HOUR_HEIGHT = 48;

let config;
let groups = [];
let currentCaseId = '245999';
let calendarMode = 'week';
let calendarDate = startOfLocalDay(new Date());

const el = id => document.getElementById(id);

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error');
  }

  return data;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateValue(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-');
}

function parseDateValue(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function startOfLocalDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0
  );
}

function addDays(date, amount) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return startOfLocalDay(result);
}

function startOfWeek(date) {
  return addDays(date, -date.getDay());
}

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function minutesToTime(minutes) {
  const normalized = Math.max(0, Math.min(1440, minutes));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${pad(hours)}:${pad(mins)}`;
}

function interval(item = { start: '08:30', end: '18:30' }) {
  const row = document.createElement('div');
  row.className = 'interval';

  row.innerHTML = `
    <input type="time" value="${item.start}">
    <input type="time" value="${item.end}">
    <button class="remove" type="button">×</button>
  `;

  row.querySelector('button').onclick = () => row.remove();

  return row;
}

function renderWeek() {
  const root = el('week');
  root.innerHTML = '';

  for (let d = 1; d <= 7; d++) {
    const day = d % 7;
    const box = document.createElement('article');

    box.className = 'day';
    box.dataset.day = day;

    box.innerHTML = `
      <h3>${names[day]}</h3>
      <div class="intervals"></div>
      <button class="add" type="button">+ Tramo</button>
    `;

    const list = box.querySelector('.intervals');
    const intervals = config.weekly[String(day)] || [];

    intervals.forEach(item => {
      list.append(interval(item));
    });

    box.querySelector('.add').onclick = () => {
      list.append(interval());
    };

    root.append(box);
  }
}

function renderHolidays() {
  const root = el('holidays');
  root.innerHTML = '';

  config.holidays
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(holiday => {
      const row = document.createElement('div');
      row.className = 'holiday';

      row.innerHTML = `
        <input type="date" value="${holiday.date}">
        <input type="text" value="${holiday.name}" placeholder="Nombre">
        <button class="remove" type="button">Eliminar</button>
      `;

      row.querySelector('button').onclick = () => row.remove();

      root.append(row);
    });
}

function exceptionRow(
  exception = {
    date: '',
    type: 'CLOSE',
    start: '13:00',
    end: '15:00',
    name: ''
  }
) {
  const row = document.createElement('div');
  row.className = 'exception';

  row.innerHTML = `
    <input type="date" value="${exception.date}">

    <select>
      <option value="CLOSE_DAY">Cierre todo el día</option>
      <option value="CLOSE">Cierre por tramo</option>
      <option value="OPEN">Apertura extraordinaria</option>
    </select>

    <input
      class="time"
      type="time"
      value="${exception.start || '13:00'}"
    >

    <input
      class="time"
      type="time"
      value="${exception.end || '15:00'}"
    >

    <input
      type="text"
      value="${exception.name}"
      placeholder="Motivo"
    >

    <button class="remove" type="button">Eliminar</button>
  `;

  const select = row.querySelector('select');
  select.value = exception.type;

  const toggle = () => {
    row.classList.toggle(
      'full-day',
      select.value === 'CLOSE_DAY'
    );
  };

  select.onchange = toggle;
  toggle();

  row.querySelector('.remove').onclick = () => row.remove();

  return row;
}

function renderExceptions() {
  const root = el('exceptions');
  root.innerHTML = '';

  config.exceptions
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(exception => {
      root.append(exceptionRow(exception));
    });
}

function renderGroups() {
  const selector = el('groupSelector');
  selector.innerHTML = '';

  groups.forEach(group => {
    const option = document.createElement('option');

    option.value = group.caseId;
    option.textContent =
      `${group.name} · Case ${group.caseId}`;

    selector.append(option);
  });

  selector.value = currentCaseId;
}

function collect() {
  document.querySelectorAll('.day').forEach(box => {
    config.weekly[box.dataset.day] =
      [...box.querySelectorAll('.interval')]
        .map(row => ({
          start: row.children[0].value,
          end: row.children[1].value
        }));
  });

  config.holidays =
    [...document.querySelectorAll('.holiday')]
      .map(row => ({
        date: row.children[0].value,
        name: row.children[1].value
      }))
      .filter(holiday => holiday.date && holiday.name);

  config.exceptions =
    [...document.querySelectorAll('.exception')]
      .map(row => {
        const exception = {
          date: row.children[0].value,
          type: row.children[1].value,
          start: row.children[2].value,
          end: row.children[3].value,
          name: row.children[4].value
        };

        if (exception.type === 'CLOSE_DAY') {
          delete exception.start;
          delete exception.end;
        }

        return exception;
      })
      .filter(exception => exception.date && exception.name);
}

function statusAt(date, minute) {
  const dateValue = formatDateValue(date);
  const day = date.getDay();

  const exceptions = (config.exceptions || [])
    .filter(item => item.date === dateValue);

  const fullClose = exceptions.find(
    item => item.type === 'CLOSE_DAY'
  );

  const partialClose = exceptions.find(
    item =>
      item.type === 'CLOSE' &&
      minute >= toMinutes(item.start) &&
      minute < toMinutes(item.end)
  );

  const specialOpen = exceptions.find(
    item =>
      item.type === 'OPEN' &&
      minute >= toMinutes(item.start) &&
      minute < toMinutes(item.end)
  );

  const holiday = (config.holidays || [])
    .find(item => item.date === dateValue);

  const weeklyIntervals =
    config.weekly[String(day)] || [];

  const weeklyOpen = weeklyIntervals.find(
    item =>
      minute >= toMinutes(item.start) &&
      minute < toMinutes(item.end)
  );

  if (fullClose) {
    return {
      type: 'holiday',
      label: fullClose.name,
      reason: 'Cierre todo el día'
    };
  }

  if (partialClose) {
    return {
      type: 'close',
      label: partialClose.name,
      reason: 'Cierre excepcional'
    };
  }

  if (specialOpen) {
    return {
      type: 'special',
      label: specialOpen.name,
      reason: 'Apertura extraordinaria'
    };
  }

  if (holiday) {
    return {
      type: 'holiday',
      label: holiday.name,
      reason: 'Feriado'
    };
  }

  if (weeklyOpen) {
    return {
      type: 'open',
      label: 'Horario hábil',
      reason: 'Horario semanal'
    };
  }

  return {
    type: 'outside',
    label: 'Fuera de horario',
    reason: 'Cerrado'
  };
}

function buildSegments(date) {
  const dateValue = formatDateValue(date);
  const boundaries = new Set([
    VISIBLE_START,
    VISIBLE_END
  ]);

  const weeklyIntervals =
    config.weekly[String(date.getDay())] || [];

  weeklyIntervals.forEach(item => {
    boundaries.add(toMinutes(item.start));
    boundaries.add(toMinutes(item.end));
  });

  (config.exceptions || [])
    .filter(item => item.date === dateValue)
    .forEach(item => {
      if (item.type !== 'CLOSE_DAY') {
        boundaries.add(toMinutes(item.start));
        boundaries.add(toMinutes(item.end));
      }
    });

  const ordered = [...boundaries]
    .filter(value =>
      value >= VISIBLE_START &&
      value <= VISIBLE_END
    )
    .sort((a, b) => a - b);

  const segments = [];

  for (let index = 0; index < ordered.length - 1; index++) {
    const start = ordered[index];
    const end = ordered[index + 1];

    if (start === end) continue;

    const status = statusAt(
      date,
      start + Math.floor((end - start) / 2)
    );

    const last = segments[segments.length - 1];

    if (
      last &&
      last.type === status.type &&
      last.label === status.label &&
      last.end === start
    ) {
      last.end = end;
    } else {
      segments.push({
        start,
        end,
        ...status
      });
    }
  }

  return segments;
}

function visibleDates() {
  if (calendarMode === 'day') {
    return [calendarDate];
  }

  const start = startOfWeek(calendarDate);

  return Array.from(
    { length: 7 },
    (_, index) => addDays(start, index)
  );
}

function renderCalendarPeriod(dates) {
  const formatter = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  if (calendarMode === 'day') {
    el('calendarPeriod').textContent =
      formatter.format(dates[0]);

    return;
  }

  el('calendarPeriod').textContent =
    `${formatter.format(dates[0])} al ${formatter.format(dates[6])}`;
}

function createTimeColumn() {
  const column = document.createElement('div');
  column.className = 'calendar-time-column';

  const header = document.createElement('div');
  header.className = 'calendar-time-header';
  column.append(header);

  const body = document.createElement('div');
  body.className = 'calendar-time-body';

  for (
    let minute = VISIBLE_START;
    minute < VISIBLE_END;
    minute += 60
  ) {
    const label = document.createElement('span');

    label.style.top =
      `${((minute - VISIBLE_START) / 60) * HOUR_HEIGHT}px`;

    label.textContent = minutesToTime(minute);

    body.append(label);
  }

  column.append(body);

  return column;
}

function createDayColumn(date) {
  const column = document.createElement('div');
  column.className = 'calendar-day-column';

  const header = document.createElement('div');
  header.className = 'calendar-day-header';

  const today = formatDateValue(new Date());
  const current = formatDateValue(date);

  if (today === current) {
    header.classList.add('today');
  }

  header.innerHTML = `
    <strong>${shortNames[date.getDay()]}</strong>
    <span>${pad(date.getDate())}/${pad(date.getMonth() + 1)}</span>
  `;

  const body = document.createElement('div');
  body.className = 'calendar-day-body';

  for (
    let minute = VISIBLE_START;
    minute < VISIBLE_END;
    minute += 60
  ) {
    const line = document.createElement('div');
    line.className = 'calendar-hour-line';

    line.style.top =
      `${((minute - VISIBLE_START) / 60) * HOUR_HEIGHT}px`;

    body.append(line);
  }

  buildSegments(date).forEach(segment => {
    const block = document.createElement('div');

    const start = Math.max(segment.start, VISIBLE_START);
    const end = Math.min(segment.end, VISIBLE_END);

    const top =
      ((start - VISIBLE_START) / 60) * HOUR_HEIGHT;

    const height =
      ((end - start) / 60) * HOUR_HEIGHT;

    block.className =
      `calendar-block calendar-block-${segment.type}`;

    block.style.top = `${top}px`;
    block.style.height = `${Math.max(height, 2)}px`;

    const showText =
      segment.type !== 'outside' &&
      height >= 22;

    if (showText) {
      block.innerHTML = `
        <strong>
          ${minutesToTime(segment.start)} - ${minutesToTime(segment.end)}
        </strong>
        <span>${segment.label}</span>
      `;
    }

    block.title =
      `${minutesToTime(segment.start)} - ${minutesToTime(segment.end)} · ${segment.label}`;

    body.append(block);
  });

  column.append(header);
  column.append(body);

  return column;
}

function renderSchedulePreview() {
  const root = el('schedulePreview');
  const dates = visibleDates();

  root.innerHTML = '';
  root.classList.toggle(
    'day-view',
    calendarMode === 'day'
  );

  renderCalendarPeriod(dates);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  grid.style.gridTemplateColumns =
    calendarMode === 'day'
      ? '72px minmax(260px, 1fr)'
      : '72px repeat(7, minmax(130px, 1fr))';

  grid.append(createTimeColumn());

  dates.forEach(date => {
    grid.append(createDayColumn(date));
  });

  root.append(grid);
}

async function loadGroup(caseId) {
  currentCaseId = String(caseId);

  config = await request(
    `/api/config?caseId=${encodeURIComponent(currentCaseId)}`
  );

  config.exceptions = config.exceptions || [];
  config.holidays = config.holidays || [];

  el('groupInfo').textContent =
    `${config.name} · Intent ID ${config.intentId} · Case ID ${config.caseId}`;

  renderWeek();
  renderHolidays();
  renderExceptions();
  renderGroups();
  renderSchedulePreview();

  await refresh();
}

async function refresh() {
  const status = await request(
    `/api/status?caseId=${encodeURIComponent(currentCaseId)}`
  );

  el('status').textContent =
    `${status.isOpen ? 'ABIERTO' : 'CERRADO'} · ${status.localDate} ${status.localTime}`;

  el('status').className =
    `status ${status.isOpen ? 'open' : 'closed'}`;

  el('endpoint').textContent =
    `GET /api/status?caseId=${currentCaseId}`;

  el('sample').textContent =
    JSON.stringify(status, null, 2);
}

function setCalendarMode(mode) {
  calendarMode = mode;

  el('weekMode').classList.toggle(
    'active',
    mode === 'week'
  );

  el('dayMode').classList.toggle(
    'active',
    mode === 'day'
  );

  renderSchedulePreview();
}

el('groupSelector').onchange = async event => {
  try {
    await loadGroup(event.target.value);
  } catch (error) {
    alert(error.message);
  }
};

el('addHoliday').onclick = () => {
  config.holidays.push({
    date: '',
    name: ''
  });

  renderHolidays();
};

el('addException').onclick = () => {
  el('exceptions').append(
    exceptionRow()
  );
};

el('previewDate').onchange = event => {
  if (!event.target.value) return;

  calendarDate = parseDateValue(event.target.value);
  renderSchedulePreview();
};

el('weekMode').onclick = () => {
  setCalendarMode('week');
};

el('dayMode').onclick = () => {
  setCalendarMode('day');
};

el('previousPeriod').onclick = () => {
  calendarDate = addDays(
    calendarDate,
    calendarMode === 'week' ? -7 : -1
  );

  el('previewDate').value =
    formatDateValue(calendarDate);

  renderSchedulePreview();
};

el('nextPeriod').onclick = () => {
  calendarDate = addDays(
    calendarDate,
    calendarMode === 'week' ? 7 : 1
  );

  el('previewDate').value =
    formatDateValue(calendarDate);

  renderSchedulePreview();
};

el('todayPeriod').onclick = () => {
  calendarDate = startOfLocalDay(new Date());

  el('previewDate').value =
    formatDateValue(calendarDate);

  renderSchedulePreview();
};

el('save').onclick = async () => {
  try {
    collect();

    await request(
      `/api/config?caseId=${encodeURIComponent(currentCaseId)}`,
      {
        method: 'PUT',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(config)
      }
    );

    const index = groups.findIndex(
      group =>
        String(group.caseId) === currentCaseId
    );

    if (index !== -1) {
      groups[index] = {
        ...groups[index],
        ...config
      };
    }

    renderSchedulePreview();
    await refresh();

    alert('Configuración guardada');
  } catch (error) {
    alert(error.message);
  }
};
el('deleteGroup').onclick = async () => {
  try {
    const group = groups.find(
      item => String(item.caseId) === String(currentCaseId)
    );

    if (!group) return;

    const confirmed = confirm(
      `¿Eliminar el grupo "${group.name}"?\n\n` +
      `Intent ID: ${group.intentId}\n` +
      `Case ID: ${group.caseId}\n\n` +
      `Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    await request(
      `/api/config?caseId=${encodeURIComponent(currentCaseId)}`,
      {
        method: 'DELETE'
      }
    );

    groups = groups.filter(
      item => String(item.caseId) !== String(currentCaseId)
    );

    await loadGroup(groups[0].caseId);

    alert('Grupo de planificación eliminado');

  } catch (error) {
    alert(error.message);
  }
};
el('newGroup').onclick = async () => {
  try {
    const name = prompt(
      'Nombre del grupo de planificación:'
    );

    if (!name || !name.trim()) return;

    const intentId = prompt('Intent ID de Lynn:');

    if (!intentId || !intentId.trim()) return;

    const caseId = prompt('Case ID de Lynn:');

    if (!caseId || !caseId.trim()) return;

    const newGroup = {
      name: name.trim(),
      intentId: intentId.trim(),
      caseId: caseId.trim(),
      timeZone: 'America/Santiago',

      weekly: {
        '0': [],
        '1': [{ start: '08:30', end: '18:30' }],
        '2': [{ start: '08:30', end: '18:30' }],
        '3': [{ start: '08:30', end: '18:30' }],
        '4': [{ start: '08:30', end: '18:30' }],
        '5': [{ start: '08:30', end: '14:30' }],
        '6': []
      },

      holidays: [],
      exceptions: []
    };

    const result = await request(
      '/api/config?groups=true',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(newGroup)
      }
    );

    groups.push(result.config);

    await loadGroup(result.config.caseId);

    alert('Grupo de planificación creado');
  } catch (error) {
    alert(error.message);
  }
};

(async () => {
  groups = await request('/api/config?groups=true');

  if (!groups.length) {
    throw new Error(
      'No existen grupos de planificación'
    );
  }

  calendarDate = startOfLocalDay(new Date());

  el('previewDate').value =
    formatDateValue(calendarDate);

  await loadGroup(groups[0].caseId);

  setInterval(refresh, 60000);
})().catch(error => {
  alert(error.message);
});
