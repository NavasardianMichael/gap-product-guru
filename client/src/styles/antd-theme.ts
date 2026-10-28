import type { ThemeConfig } from 'antd';

/** Gap "breakthrough executive" purple and its hover shade (ClientWorldUI palette). */
const BRAND_PRIMARY = '#59315f';
const BRAND_PRIMARY_HOVER = '#46274b';
const BRAND_BACKGROUND = '#f6f4f7';

export const theme: ThemeConfig = {
  token: {
    // Primary color
    colorPrimary: BRAND_PRIMARY,
    colorLink: BRAND_PRIMARY,
    colorLinkHover: BRAND_PRIMARY_HOVER,

    // Border radius
    borderRadius: 8,

    // Font (CentraNo2 is loaded by kit.css in index.html)
    fontFamily: "CentraNo2, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",

    colorBgLayout: BRAND_BACKGROUND,
  },
  components: {
    Button: {
      primaryShadow: 'none',
    },
    Input: {
      activeShadow: 'none',
    },
    Layout: {
      bodyBg: BRAND_BACKGROUND,
      siderBg: '#ffffff',
    },
    Spin: {
      colorPrimary: BRAND_PRIMARY,
    },
  },
};
