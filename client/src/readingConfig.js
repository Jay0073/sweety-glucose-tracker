export const SLOTS = [
  { value: 'morning', label: 'Morning (fasting)', shortLabel: 'Morning' },
  { value: 'after_breakfast', label: 'After breakfast', shortLabel: 'Breakfast' },
  { value: 'after_lunch', label: 'After lunch', shortLabel: 'Lunch' },
  { value: 'after_dinner', label: 'After dinner', shortLabel: 'Dinner' }
];

export const SLOT_LABELS = Object.fromEntries(SLOTS.map((slot) => [slot.value, slot.label]));

export function slotForHour(hour = new Date().getHours()) {
  if (hour < 8) return 'morning';
  if (hour < 12) return 'after_breakfast';
  if (hour < 18) return 'after_lunch';
  return 'after_dinner';
}

export function slotPosition(slot) {
  return SLOTS.findIndex((item) => item.value === slot);
}

export function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateString, options = {}) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options
  }).format(date);
}

