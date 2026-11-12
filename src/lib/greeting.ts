const singaporeHour = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore', hour: 'numeric', hourCycle: 'h23',
})

export function getGreeting(date = new Date()): string {
  const hour = Number(singaporeHour.format(date))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
