export interface GameTheme {
  id: string;
  name: string;
  tagline: string;
  background: string;
  surface: string;
  accent: string;
  gradientFrom: string;
  gradientTo: string;
  chartPrimary: string;
  chartSecondary: string;
  badgeColor: string;
  inputType: 'tag';
  logo: string;
  fontClass: string;
}

export const games: GameTheme[] = [
  {
    id: 'clash-royale',
    name: 'Clash Royale',
    tagline: 'Real-time card battle arena',
    background: '#0B0F1A',
    surface: '#111827',
    accent: '#4D7FFF',
    gradientFrom: '#0A1832',
    gradientTo: '#1E3A72',
    chartPrimary: '#4D7FFF',
    chartSecondary: '#F4C430',
    badgeColor: '#4D7FFF',
    inputType: 'tag',
    logo: '👑',
    fontClass: 'font-cr',
  },
  {
    id: 'brawl-stars',
    name: 'Brawl Stars',
    tagline: 'Fast-paced multiplayer brawls',
    background: '#0B0F1A',
    surface: '#111827',
    accent: '#FFC800',
    gradientFrom: '#1A0F0B',
    gradientTo: '#4C3200',
    chartPrimary: '#FFC800',
    chartSecondary: '#FF3B3B',
    badgeColor: '#FFC800',
    inputType: 'tag',
    logo: '⭐',
    fontClass: 'font-bs',
  },
  {
    id: 'clash-of-clans',
    name: 'Clash of Clans',
    tagline: 'Build, raid, conquer',
    background: '#0B0F1A',
    surface: '#111827',
    accent: '#8BC34A',
    gradientFrom: '#0F1A0D',
    gradientTo: '#243D1A',
    chartPrimary: '#8BC34A',
    chartSecondary: '#FFD700',
    badgeColor: '#8BC34A',
    inputType: 'tag',
    logo: '🏰',
    fontClass: 'font-coc',
  },

];

export const getGameById = (id: string): GameTheme | undefined =>
  games.find(game => game.id === id);
