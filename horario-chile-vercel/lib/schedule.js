'use strict';

const DEFAULT_CONFIG = {
  name: 'Horario atención Chile',
  timeZone: 'America/Santiago',
  weekly: {
    '1': [{ start: '08:30', end: '18:30' }],
    '2': [{ start: '08:30', end: '18:30' }],
    '3': [{ start: '08:30', end: '18:30' }],
    '4': [{ start: '08:30', end: '18:30' }],
    '5': [{ start: '08:30', end: '14:30' }],
    '6': [],
    '0': []
  },
  holidays: [],
  exceptions: []
};

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    dateTime: `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`,
    day: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[values.weekday]
  };
}

function evaluate(config, instant = new Date()) {
  if (Number.isNaN(instant.getTime())) throw new Error('Fecha inválida');
  const local = localParts(instant, config.timeZone);
  const current = toMinutes(local.time);
  const exceptions = (config.exceptions || []).filter(item => item.date === local.date);
  const fullClose = exceptions.find(item => item.type === 'CLOSE_DAY');
  const partialClose = exceptions.find(item => item.type === 'CLOSE' && current >= toMinutes(item.start) && current < toMinutes(item.end));
  const specialOpen = exceptions.find(item => item.type === 'OPEN' && current >= toMinutes(item.start) && current < toMinutes(item.end));
  const holiday = (config.holidays || []).find(item => item.date === local.date);
  const intervals = config.weekly[String(local.day)] || [];
  const activeInterval = intervals.find(item => current >= toMinutes(item.start) && current < toMinutes(item.end));

  let isOpen = false;
  let reason = 'OUTSIDE_BUSINESS_HOURS';
  let flujoActivo = 'Cerrado_Hora';
  let exception = null;

  if (fullClose) {
    reason = 'SPECIAL_CLOSURE_DAY'; flujoActivo = 'Cerrado_Excepcion'; exception = fullClose;
  } else if (partialClose) {
    reason = 'SPECIAL_CLOSURE'; flujoActivo = 'Cerrado_Excepcion'; exception = partialClose;
  } else if (specialOpen) {
    isOpen = true; reason = 'SPECIAL_OPENING'; flujoActivo = 'Horario_OK'; exception = specialOpen;
  } else if (holiday) {
    reason = 'HOLIDAY'; flujoActivo = 'Cerrado_Feriado';
  } else if (activeInterval) {
    isOpen = true; reason = 'OPEN'; flujoActivo = 'Horario_OK';
  } else if (local.day === 0 || local.day === 6) {
    reason = 'WEEKEND'; flujoActivo = 'Cerrado_FinDeSemana';
  }

  return {
    isOpen,
    esHorarioHabil: isOpen ? 'true' : 'false',
    flujoActivo,
    reason,
    localDate: local.date,
    localTime: local.time,
    localDateTime: local.dateTime,
    timeZone: config.timeZone,
    holiday: holiday || null,
    exception,
    activeInterval: activeInterval || null
  };
}

function validTime(value) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function validate(config) {
  if (!config || typeof config.name !== 'string' || config.timeZone !== 'America/Santiago') return 'Configuración inválida';
  if (!config.weekly || !Array.isArray(config.holidays) || !Array.isArray(config.exceptions)) return 'Faltan weekly, holidays o exceptions';
  for (let day = 0; day <= 6; day++) {
    if (!Array.isArray(config.weekly[String(day)])) return `Día ${day} inválido`;
    for (const interval of config.weekly[String(day)]) {
      if (!validTime(interval.start) || !validTime(interval.end) || toMinutes(interval.start) >= toMinutes(interval.end)) return `Intervalo inválido en día ${day}`;
    }
  }
  for (const holiday of config.holidays) if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday.date) || !holiday.name) return 'Feriado inválido';
  for (const exception of config.exceptions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.date) || !exception.name || !['CLOSE_DAY', 'CLOSE', 'OPEN'].includes(exception.type)) return 'Excepción inválida';
    if (exception.type !== 'CLOSE_DAY' && (!validTime(exception.start) || !validTime(exception.end) || toMinutes(exception.start) >= toMinutes(exception.end))) return 'Horario de excepción inválido';
  }
  return null;
}

module.exports = { DEFAULT_CONFIG, evaluate, validate };
