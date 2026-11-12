export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Turns a stored date into the "YYYY-MM-DD" string <input type="date"> expects.
export function toDateInputValue(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}
