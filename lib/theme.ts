export const theme = {
  colors: {
    primary: '#5BB8A5',
    primaryDark: '#3D9B88',
    primaryLight: '#A8DDD0',
    primarySoft: '#E8F6F2',

    secondary: '#F4A261',
    secondaryLight: '#FBE3D0',

    accent: '#7DD3C0',

    success: '#6BBF59',
    warning: '#F4A261',
    error: '#E76F51',

    background: '#F7FAF9',
    surface: '#FFFFFF',
    surfaceAlt: '#F0F5F3',

    textPrimary: '#2D3A3A',
    textSecondary: '#6B7B7B',
    textLight: '#9BAAAA',
    textOnPrimary: '#FFFFFF',

    border: '#E0E8E6',
    borderLight: '#EDF2F0',

    shadow: 'rgba(91, 184, 165, 0.15)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  fontSizes: {
    caption: 12,
    body: 15,
    subtitle: 17,
    title: 20,
    heading: 24,
    largeHeading: 32,
    hugeNumber: 48,
  },
  fonts: {
    regular: 'NotoSansSC-Regular',
    medium: 'NotoSansSC-Medium',
    bold: 'NotoSansSC-Bold',
  },
} as const;
