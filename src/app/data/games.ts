export interface GameTheme {
  id: string;
  name: string;
  /** Two or three letters for tight spots (header switcher, recent-search chips). */
  shortName: string;
  tagline: string;
  /** Same hex as the game's --accent in theme.css (data/__tests__/games.test.ts checks it). */
  accent: string;
  /** Line colour of the trophy trend (an SVG attribute, so a hex rather than a class). */
  chartPrimary: string;
}

export const games: GameTheme[] = [
  {
    id: 'clash-royale',
    name: 'Clash Royale',
    shortName: 'CR',
    tagline: 'Real-time card battle arena',
    accent: '#4C8DFF',
    chartPrimary: '#4C8DFF',
  },
  {
    id: 'brawl-stars',
    name: 'Brawl Stars',
    shortName: 'BS',
    tagline: 'Fast-paced multiplayer brawls',
    accent: '#FFC21A',
    chartPrimary: '#FFC21A',
  },
  {
    id: 'clash-of-clans',
    name: 'Clash of Clans',
    shortName: 'CoC',
    tagline: 'Build, raid, conquer',
    accent: '#5BD65B',
    chartPrimary: '#5BD65B',
  },
];

export const getGameById = (id: string): GameTheme | undefined =>
  games.find(game => game.id === id);
