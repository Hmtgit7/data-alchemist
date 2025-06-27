import * as React from "react"
import * as RechartsPrimitive from "recharts"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = {
  light: "[data-theme='light']",
  dark: "[data-theme='dark']",
} as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

const ChartContainer = React.forwardRef<
  React.ElementRef<typeof RechartsPrimitive.ResponsiveContainer>,
  React.ComponentPropsWithoutRef<typeof RechartsPrimitive.ResponsiveContainer>
>(({ className, ...props }, ref) => (
  <RechartsPrimitive.ResponsiveContainer
    ref={ref}
    className={className}
    {...props}
  />
))
ChartContainer.displayName = "Chart"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, conf]) => conf.theme || conf.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartLegend = RechartsPrimitive.Legend

const Chart = React.forwardRef<
  React.ElementRef<typeof RechartsPrimitive.ResponsiveContainer>,
  React.ComponentPropsWithoutRef<typeof RechartsPrimitive.ResponsiveContainer> & {
    config?: ChartConfig
  }
>(({ config, ...props }, ref) => (
  <>
    {config && <ChartStyle id={String(props.id) || "chart"} config={config} />}
    <ChartContainer ref={ref} {...props} />
  </>
))
Chart.displayName = "Chart"

export {
  Chart,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartStyle,
}
