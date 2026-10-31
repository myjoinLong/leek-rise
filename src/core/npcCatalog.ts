export const npcIds = [
  'jiuge',
  'longge',
  'chen',
  'bodhisattva',
  'xiaolian',
  'sujie',
  'zhou',
  'wang',
  'laoliang',
  'sweeper',
  'delivery',
  'zheng',
  'phoneflip',
] as const;

export type NpcId = (typeof npcIds)[number];
