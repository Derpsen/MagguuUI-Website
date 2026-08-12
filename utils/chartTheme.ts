export interface ChartDataPoint {
  label: string
  value: number
}

export interface ChartTheme {
  textColor: string
  primaryTextColor: string
  gridLineColor: string
  tooltip: {
    backgroundColor: string
    borderColor: string
    textStyle: { color: string, fontSize: number }
  }
}

export function createChartTheme(isDark: boolean, textOpacity = 0.7): ChartTheme {
  return {
    textColor: isDark
      ? `rgba(148, 163, 184, ${textOpacity})`
      : `rgba(100, 116, 139, ${textOpacity})`,
    primaryTextColor: isDark ? '#e2e8f0' : '#1e293b',
    gridLineColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    tooltip: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
    },
  }
}
