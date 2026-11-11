export const CLINIC_TIME_ZONE = 'America/New_York';

const DAY_MS = 24 * 60 * 60 * 1000;

function clinicDayNumber(date) {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export function daysFromToday(dateString) {
  return clinicDayNumber(new Date(dateString)) - clinicDayNumber(new Date());
}

export function getDateParts(dateString) {
  const date = new Date(dateString);
  const format = (options) =>
    date.toLocaleString('en-US', { timeZone: CLINIC_TIME_ZONE, ...options });

  return {
    weekday: format({ weekday: 'short' }),
    weekdayLong: format({ weekday: 'long' }),
    day: format({ day: 'numeric' }),
    month: format({ month: 'short' }),
    time: format({ hour: 'numeric', minute: '2-digit' }),
    fullDate: format({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

export function relativeDayLabel(dateString) {
  const diff = daysFromToday(dateString);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff >= 7 && diff < 14) return 'Next week';
  if (diff >= 14 && diff < 60) return `In ${Math.round(diff / 7)} weeks`;
  if (diff >= 60) return `In ${Math.round(diff / 30)} months`;
  return getDateParts(dateString).fullDate;
}

export function greetingForNow() {
  const hour = Number(
    new Date().toLocaleString('en-US', {
      timeZone: CLINIC_TIME_ZONE,
      hour: 'numeric',
      hour12: false,
    })
  );
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
