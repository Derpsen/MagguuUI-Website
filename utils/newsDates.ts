/** Public news dates: calendar date in UTC, since seed publishedAt is midnight UTC. */

export function toIsoDate(publishedAt: number): string {
  return new Date(publishedAt * 1000).toISOString().slice(0, 10)
}

export function formatNewsDate(publishedAt: number): string {
  return new Date(publishedAt * 1000).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
