import * as React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

/**
 * Shims for react-resizable-panels v4:
 * - v4 renamed `direction` -> `orientation`
 * - the imperative handle (resize/collapse/expand/isCollapsed/getSize) is
 *   exposed ONLY via the `panelRef` prop, so the React `ref` our call sites
 *   use is forwarded into it
 * - `onLayoutChanged` (debounced, fires after drag release) is the
 *   recommended persistence hook; `onLayoutChange` fires per pointer move
 */
const ResizablePanelGroup = ({
  className,
  direction,
  onLayout,
  onLayoutChange,
  onLayoutChanged,
  ...props
}) => (
  <ResizablePrimitive.Group
    orientation={direction || "horizontal"}
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    onLayoutChanged={onLayoutChanged || onLayoutChange || onLayout}
    {...props} />
)
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = React.forwardRef(({
  onCollapse,
  onExpand,
  onResize,
  ...props
}, ref) => {
  const isCollapsedRef = React.useRef(false)

  // v4 onResize: (panelSize {asPercentage, inPixels}, id, prevPanelSize)
  const handleResize = (panelSize, id, prevPanelSize) => {
    if (onResize) {
      onResize(panelSize, id, prevPanelSize)
    }

    const isCollapsed = panelSize.asPercentage === 0
    if (isCollapsed !== isCollapsedRef.current) {
      isCollapsedRef.current = isCollapsed
      if (isCollapsed) {
        if (onCollapse) onCollapse()
      } else {
        if (onExpand) onExpand()
      }
    }
  }

  return (
    <ResizablePrimitive.Panel
      panelRef={ref}
      onResize={handleResize}
      {...props}
    />
  )
})
ResizablePanel.displayName = "ResizablePanel"

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}) => (
  <ResizablePrimitive.Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className
    )}
    {...props}>
    {withHandle && (
      <div
        className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
