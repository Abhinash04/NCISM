import * as React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = React.forwardRef(({
  className,
  onLayout,
  onLayoutChange,
  ...props
}, ref) => (
  <ResizablePrimitive.Group
    ref={ref}
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    onLayoutChange={onLayoutChange || onLayout}
    {...props} />
))
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = React.forwardRef(({
  onCollapse,
  onExpand,
  onResize,
  ...props
}, ref) => {
  const isCollapsedRef = React.useRef(false)

  const handleResize = (size, id, prevSize) => {
    if (onResize) {
      onResize(size, id, prevSize)
    }

    const isCollapsed = size.asPercentage === 0
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
      ref={ref}
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
