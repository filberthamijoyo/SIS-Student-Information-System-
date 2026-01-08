// components/Schedule/constants.ts

export const TIME_SLOTS = [
  // Lecture slots (80 minutes)
  { start: '08:30', end: '09:50', label: '08:30-09:50', duration: 80, type: 'lecture' },
  { start: '10:30', end: '11:50', label: '10:30-11:50', duration: 80, type: 'lecture' },
  { start: '13:30', end: '14:50', label: '13:30-14:50', duration: 80, type: 'lecture' },
  { start: '15:30', end: '16:50', label: '15:30-16:50', duration: 80, type: 'lecture' },
  
  // Tutorial slots (50 minutes)
  { start: '18:00', end: '18:50', label: '18:00-18:50', duration: 50, type: 'tutorial' },
  { start: '19:00', end: '19:50', label: '19:00-19:50', duration: 50, type: 'tutorial' },
  { start: '20:00', end: '20:50', label: '20:00-20:50', duration: 50, type: 'tutorial' },
];

export const LECTURE_SLOTS = TIME_SLOTS.filter(slot => slot.type === 'lecture');
export const TUTORIAL_SLOTS = TIME_SLOTS.filter(slot => slot.type === 'tutorial');

