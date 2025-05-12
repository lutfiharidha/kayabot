import moment from 'moment-timezone';
moment.tz.setDefault('Asia/Jakarta');

export function getJakartaTime(): string {
  return moment().format('YYYY-MM-DD HH:mm:ss');
}

export function getStartOfDayJakarta(): string {
  return moment().tz('Asia/Jakarta').startOf('day').format('YYYY-MM-DD HH:mm:ss');
}

export function getJakartaTime1year(): string {
  return moment().tz('Asia/Jakarta').add(1, 'year').format('YYYY-MM-DD HH:mm:ss');
}

export function getJakartaTime1month(): string {
  return moment().tz('Asia/Jakarta').add(1, 'month').format('YYYY-MM-DD HH:mm:ss');
}