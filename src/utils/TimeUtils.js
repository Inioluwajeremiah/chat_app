function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function calculateExpirationMonth(date) {
  const month = new Date(date).getMonth();
  const year = new Date(date).getFullYear();
  const daysInMonth = getDaysInMonth(year, month);
  const oneMonth = daysInMonth * 24 * 60 * 60 * 1000;
  const expirationMonth = new Date(date.getTime() + oneMonth);
  return expirationMonth;
}

export function calculateExpirationYear(date) {
  const millisecondsPerMinute = 60 * 1000;
  const millisecondsPerHour = millisecondsPerMinute * 60;
  const millisecondsPerDay = millisecondsPerHour * 24;
  const millisecondsPerYear = millisecondsPerDay * 365;

  const expirationYear = new Date(date.getTime() + millisecondsPerYear);
  return expirationYear;
}
