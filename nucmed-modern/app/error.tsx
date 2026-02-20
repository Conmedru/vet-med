'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="container flex flex-col items-center justify-center min-h-[50vh] py-12 text-center space-y-4">
      <h2 className="text-2xl font-bold">Что-то пошло не так!</h2>
      <p className="text-muted-foreground max-w-md">
        Произошла ошибка при загрузке страницы. Пожалуйста, убедитесь, что база данных подключена корректно.
      </p>
      <div className="text-left bg-muted/50 p-4 rounded-lg max-w-lg w-full overflow-auto">
        <p className="font-semibold text-sm mb-2">Детали ошибки:</p>
        <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">
          {error.message}
        </pre>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono mt-2 pt-2 border-t">
            Digest: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={() => reset()}>Попробовать снова</Button>
    </div>
  )
}
