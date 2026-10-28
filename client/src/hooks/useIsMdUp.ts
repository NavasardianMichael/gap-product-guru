import { Grid } from 'antd';

/** `true` at Ant Design `md` (768px+) — the sidebar is docked from here up, a drawer below. */
export const useIsMdUp = (): boolean => {
  const screens = Grid.useBreakpoint();
  return screens.md === true;
};
