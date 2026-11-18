import { Coffee, MoonStar, Sunrise, SunMedium } from 'lucide-react';

export const SLOT_COLORS = {
  morning: '#58a99d',
  after_breakfast: '#d99b2c',
  after_lunch: '#c75f7c',
  after_dinner: '#6872a0'
};

const SLOT_ICONS = {
  morning: Sunrise,
  after_breakfast: Coffee,
  after_lunch: SunMedium,
  after_dinner: MoonStar
};

export function SlotMomentIcon({ slot, size = 20 }) {
  const Icon = SLOT_ICONS[slot] ?? Sunrise;
  return <span aria-hidden="true" className={`slot-moment slot-moment--${slot}`}><Icon size={size} /></span>;
}
