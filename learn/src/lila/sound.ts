// Змінено для logic-games-kids: звуки уроків через спільний набір сайту (LG).
const lg = () => (window as any).LG;
const file = (name: string) => () => lg()?.playFile(new URL(`../../shared/sounds/${name}.mp3`, document.baseURI).href);
export const move = file('move');
export const take = file('capture');
export const levelStart = () => {};
export const levelEnd = () => lg()?.play('place');
export const stageStart = () => {};
export const stageEnd = () => {};
export const failure = () => lg()?.play('error');
