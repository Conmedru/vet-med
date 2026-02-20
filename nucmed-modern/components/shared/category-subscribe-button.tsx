"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SubscribeDialog } from "@/components/dialogs/subscribe-dialog"

interface CategorySubscribeButtonProps {
  category: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function CategorySubscribeButton({
  category,
  variant = "outline",
  size = "sm",
  className,
}: CategorySubscribeButtonProps) {
  return (
    <SubscribeDialog
      initialCategory={category}
      trigger={
        <Button variant={variant} size={size} className={className}>
          <Bell className="h-4 w-4 mr-1.5" />
          Подписаться на раздел
        </Button>
      }
    />
  )
}
