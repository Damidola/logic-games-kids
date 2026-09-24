const make = (name: string, volume?: number) => {
  site.sound.load(name, site.sound.url(`${name}.mp3`));
  return () => site.sound.play(name, volume);
};

// Гучність у 2 рази нижча за Lichess (зірочка й новий рівень — ще тихіше): у дитячих уроках звуки звучать дуже часто
export const move = () => site.sound.play('move', 0.5);
export const take = make('sfx/Tournament3rd', 0.065);
export const levelStart = make('other/ping', 0.2);
export const levelEnd = make('other/energy3', 0.5);
export const stageStart = make('other/guitar', 0.5);
export const stageEnd = make('other/gewonnen', 0.5);
export const failure = make('other/no-go', 0.5);
