# 🚀 Production Configuration for Timeweb Cloud

Скопируйте эти значения в раздел **"Переменные"** (Environment Variables) в настройках вашего приложения Vet Umbriel.

## 1. База данных (Managed PostgreSQL)
Мы используем вашу новую базу данных. Я сформировал строку подключения с паролем.
*Обратите внимание: я изменил `sslmode=verify-full` на `sslmode=require`, чтобы оно работало внутри Docker-контейнера без необходимости монтировать файлы сертификатов.*

| Ключ | Значение |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` |
| `DIRECT_URL` | `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` |

## 2. S3 Хранилище (Обложки)

| Ключ | Значение |
| :--- | :--- |
| `S3_ENDPOINT` | `https://s3.twcstorage.ru` |
| `S3_BUCKET` | `YOUR_BUCKET_ID` |
| `S3_REGION` | `ru-1` |
| `S3_ACCESS_KEY` | `YOUR_ACCESS_KEY` |
| `S3_SECRET_KEY` | `YOUR_SECRET_KEY` |
| `S3_PREFIX` | `YOUR_PREFIX` |

## 3. Настройки Приложения

| Ключ | Значение |
| :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR_DOMAIN` |
| `NODE_ENV` | `production` |
| `REPLICATE_API_TOKEN` | `YOUR_REPLICATE_TOKEN` |
| `AI_MODEL` | `gpt-4o-mini` |
| `ADMIN_PASSWORD` | `YOUR_ADMIN_PASSWORD` |
| `ADMIN_API_KEY` | `YOUR_ADMIN_API_KEY` |

---

## 🛡 Как не потерять данные (Важно!)

После того как приложение запустится (статус станет "Running"), вам нужно **один раз** инициализировать структуру базы данных.

1. Перейдите на вкладку **"Консоль"** (Console) внутри приложения в Timeweb.
2. Выполните команду:
   ```bash
   npx prisma migrate deploy
   ```

**Почему это безопасно:**
*   Команда `migrate deploy` **только добавляет** новые таблицы и колонки.
*   Она **НИКОГДА** не удаляет данные (в отличие от `db push` или `migrate reset`).
*   Если база пустая (как сейчас), она создаст всю структуру с нуля.
