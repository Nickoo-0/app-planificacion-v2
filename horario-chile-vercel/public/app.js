const names = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

let config;
let groups = [];
let currentCaseId = '245999';

const el = id => document.getElementById(id);

async function request(url, options) {
  const r = await fetch(url, options);
  const j = await r.json();

  if (!r.ok) throw new Error(j.error || 'Error');

  return j;
}

function interval(item = { start: '08:30', end: '18:30' }) {
  const row = document.createElement('div');
  row.className = 'interval';

  row.innerHTML = `
    <input type="time" value="${item.start}">
    <input type="time" value="${item.end}">
    <button class="remove">×</button>
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
      <button class="add">+ Tramo</button>
    `;

    const list = box.querySelector('.intervals');

    config.weekly[day].forEach(i => {
      list.append(interval(i));
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
    .forEach(h => {
      const row = document.createElement('div');

      row.className = 'holiday';

      row.innerHTML = `
        <input type="date" value="${h.date}">
        <input type="text" value="${h.name}" placeholder="Nombre">
        <button class="remove">Eliminar</button>
      `;

      row.querySelector('button').onclick = () => row.remove();

      root.append(row);
    });
}

function exceptionRow(
  e = {
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
    <input type="date" value="${e.date}">
    <select>
      <option value="CLOSE_DAY">Cierre todo el día</option>
      <option value="CLOSE">Cierre por tramo</option>
      <option value="OPEN">Apertura extraordinaria</option>
    </select>

    <input class="time" type="time" value="${e.start || '13:00'}">
    <input class="time" type="time" value="${e.end || '15:00'}">

    <input type="text" value="${e.name}" placeholder="Motivo">

    <button class="remove">Eliminar</button>
  `;

  const select = row.querySelector('select');

  select.value = e.type;

  const toggle = () => {
    row.classList.toggle(
      'full-day',
      select.value === 'CLOSE_DAY'
    );
  };

  select.onchange = toggle;

  toggle();

  row.querySelector('button').onclick = () => row.remove();

  return row;
}

function renderExceptions() {
  const root = el('exceptions');
  root.innerHTML = '';

  config.exceptions
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => {
      root.append(exceptionRow(e));
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
        .map(r => ({
          start: r.children[0].value,
          end: r.children[1].value
        }));
  });

  config.holidays =
    [...document.querySelectorAll('.holiday')]
      .map(r => ({
        date: r.children[0].value,
        name: r.children[1].value
      }))
      .filter(h => h.date && h.name);

  config.exceptions =
    [...document.querySelectorAll('.exception')]
      .map(r => {
        const e = {
          date: r.children[0].value,
          type: r.children[1].value,
          start: r.children[2].value,
          end: r.children[3].value,
          name: r.children[4].value
        };

        if (e.type === 'CLOSE_DAY') {
          delete e.start;
          delete e.end;
        }

        return e;
      })
      .filter(e => e.date && e.name);
}

async function renderSchedulePreview() {
  const date = el('previewDate').value;
  const root = el('schedulePreview');

  if (!date) {
    root.innerHTML = '';
    return;
  }

  const times = [
    '00:00',
    '06:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '23:00'
  ];

  const results = [];

  for (const time of times) {
    const at = `${date}T${time}:00-03:00`;

    try {
      const status = await request(
        `/api/status?caseId=${encodeURIComponent(currentCaseId)}&at=${encodeURIComponent(at)}`
      );

      results.push({
        time,
        isOpen: status.isOpen,
        reason: status.reason
      });
    } catch (error) {
      results.push({
        time,
        isOpen: false,
        reason: 'ERROR'
      });
    }
  }

  root.innerHTML = '';

  results.forEach(item => {
    const row = document.createElement('div');

    row.style.padding = '8px 0';
    row.style.borderBottom = '1px solid #dce3ee';

    row.innerHTML = `
      <strong>${item.time}</strong>
      ·
      <span style="color:${item.isOpen ? '#126b3a' : '#a12727'}">
        ${item.isOpen ? 'ABIERTO' : 'CERRADO'}
      </span>
      · ${item.reason}
    `;

    root.append(row);
  });
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

  if (el('previewDate').value) {
    await renderSchedulePreview();
  }

  await refresh();
}

async function refresh() {
  const s = await request(
    `/api/status?caseId=${encodeURIComponent(currentCaseId)}`
  );

  el('status').textContent =
    `${s.isOpen ? 'ABIERTO' : 'CERRADO'} · ${s.localDate} ${s.localTime}`;

  el('status').className =
    `status ${s.isOpen ? 'open' : 'closed'}`;

  el('endpoint').textContent =
    `GET /api/status?caseId=${currentCaseId}`;

  el('sample').textContent =
    JSON.stringify(s, null, 2);
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

el('previewDate').onchange = async () => {
  try {
    await renderSchedulePreview();
  } catch (error) {
    alert(error.message);
  }
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

    if (el('previewDate').value) {
      await renderSchedulePreview();
    }

    await refresh();

    alert('Configuración guardada');

  } catch (error) {
    alert(error.message);
  }
};

el('newGroup').onclick = async () => {
  try {
    const name = prompt('Nombre del grupo de planificación:');
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

    currentCaseId = String(result.config.caseId);

    renderGroups();

    await loadGroup(currentCaseId);

    alert('Grupo de planificación creado');

  } catch (error) {
    alert(error.message);
  }
};

(async () => {
  groups = await request('/api/config?groups=true');

  if (!groups.length) {
    throw new Error('No existen grupos de planificación');
  }

  currentCaseId = String(groups[0].caseId);

  renderGroups();

  await loadGroup(currentCaseId);

  setInterval(refresh, 60000);

})().catch(error => {
  alert(error.message);
});
