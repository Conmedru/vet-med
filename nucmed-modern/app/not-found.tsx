import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
      <div className="rounded-full bg-muted p-6">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Страница не найдена</h1>
        <p className="text-muted-foreground max-w-[500px]">
          К сожалению, запрашиваемая страница не существует или была перемещена.
          Возможно, вы перешли по устаревшей ссылке.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Вернуться на главную</Link>
      </Button>
    </div>
  )
}
