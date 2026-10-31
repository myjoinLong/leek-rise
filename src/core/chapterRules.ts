export type GameChapterId = 'SURVIVAL' | 'GREED' | 'ABYSS';
export type GameChapterNumber = 1 | 2 | 3;

export interface GameChapter {
  id: GameChapterId;
  number: GameChapterNumber;
  title: string;
  startDay: number;
  endDay: number | null;
}

const chapters: readonly GameChapter[] = [
  { id: 'SURVIVAL', number: 1, title: '活下去', startDay: 1, endDay: 30 },
  { id: 'GREED', number: 2, title: '贪婪', startDay: 31, endDay: 100 },
  { id: 'ABYSS', number: 3, title: '深渊', startDay: 101, endDay: null },
];

export function chapterForDay(day: number): GameChapter {
  if (day >= 101) return chapters[2]!;
  if (day >= 31) return chapters[1]!;
  return chapters[0]!;
}

export function fixedOperatingCostMultiplierForDay(day: number): 1 | 2 {
  return chapterForDay(day).number === 1 ? 1 : 2;
}
