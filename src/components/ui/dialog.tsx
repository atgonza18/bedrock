"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // Solid dim for no-blur browsers, whisper of glass for the rest.
        "fixed inset-0 isolate z-50 bg-foreground/30 supports-[backdrop-filter]:bg-foreground/25 supports-[backdrop-filter]:backdrop-blur-[2px] duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Layout + motion
          "fixed left-1/2 top-1/2 z-50 w-full max-w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden",
          "rounded-xl bg-popover text-popover-foreground outline-none",
          // Premium surface: crisp hairline + soft elevated shadow
          "border border-border/70 shadow-2xl shadow-foreground/10 dark:shadow-black/40 dark:border-border/50",
          // Default sizing — callers can override with sm:max-w-lg etc.
          "sm:max-w-md",
          // Motion — quick spring-like fade + subtle upward slide
          "duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/**
 * Header region — kerned eyebrow + title + description, with a hairline
 * separator below. Use `<DialogEyebrow>`, `<DialogTitle>`, `<DialogDescription>`
 * inside.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "px-6 pt-6 pb-5 border-b border-border/70 space-y-1 text-left",
        className,
      )}
      {...props}
    />
  )
}

/** Body region — consistent padding for content between header and footer. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("px-6 py-5 space-y-5", className)}
      {...props}
    />
  )
}

/** Footer region — hairline separator, right-aligned action buttons. */
function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "border-t border-border/70 px-6 py-4 flex items-center justify-end gap-2",
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg font-semibold leading-tight tracking-tight",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground leading-relaxed pt-1 *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

/** Kerned uppercase eyebrow that sits above the dialog title. */
function DialogEyebrow({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-eyebrow"
      className={cn(
        "text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium",
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
