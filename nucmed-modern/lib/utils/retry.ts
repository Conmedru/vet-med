/**
 * Retry utility with exponential backoff
 * Для надёжной работы с внешними API (Replicate, etc.)
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry">> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "rate limit",
    "429",
    "503",
    "502",
    "timeout",
  ],
};

/**
 * Проверка, является ли ошибка retriable
 */
function isRetryableError(error: Error, patterns: string[]): boolean {
  const errorString = `${error.name} ${error.message}`.toLowerCase();
  return patterns.some((pattern) => 
    errorString.includes(pattern.toLowerCase())
  );
}

/**
 * Задержка с промисом
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Выполнить функцию с retry и exponential backoff
 * 
 * @example
 * const result = await withRetry(
 *   () => callReplicateAI(prompt),
 *   { maxAttempts: 3, onRetry: (n, err) => console.log(`Retry ${n}: ${err.message}`) }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("No attempts made");
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Последняя попытка — пробрасываем ошибку
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Проверяем, можно ли retry
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        break;
      }

      // Callback перед retry
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, delay);
      }

      // Ждём перед следующей попыткой
      await sleep(delay);

      // Увеличиваем delay для следующей попытки
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Декоратор для автоматического retry
 */
export function retryable(options?: RetryOptions) {
  return function <T>(
    _target: object,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), options);
    };
    
    return descriptor;
  };
}
