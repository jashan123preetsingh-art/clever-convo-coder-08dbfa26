/** Check if Indian stock market (NSE) is currently open */
export function isMarketHours(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const istMinutes = utcMinutes + istOffset;
  const istHour = Math.floor((istMinutes >= 0 ? istMinutes : istMinutes + 1440) / 60) % 24;
  const istMin = (istMinutes >= 0 ? istMinutes : istMinutes + 1440) % 60;
  const istDay = now.getUTCDay();

  if (istDay === 0 || istDay === 6) return false;

  const timeInMinutes = istHour * 60 + istMin;
  return timeInMinutes >= 555 && timeInMinutes <= 930;
}
