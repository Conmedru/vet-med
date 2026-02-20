import { Metadata } from "next";
import { Mail, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Контакты | VetMed",
  description: "Свяжитесь с редакцией VetMed — вопросы, предложения, сотрудничество.",
};

export default function ContactPage() {
  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="text-4xl font-serif font-bold mb-4">Контакты</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Мы всегда рады обратной связи и открыты к сотрудничеству.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Электронная почта
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Общие вопросы:</strong><br />
              <a href="mailto:info@vetmed.ru" className="text-primary hover:underline">
                info@vetmed.ru
              </a>
            </p>
            <p>
              <strong>Редакция:</strong><br />
              <a href="mailto:editor@vetmed.ru" className="text-primary hover:underline">
                editor@vetmed.ru
              </a>
            </p>
            <p>
              <strong>Реклама и партнёрство:</strong><br />
              <a href="mailto:partner@vetmed.ru" className="text-primary hover:underline">
                partner@vetmed.ru
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Режим работы редакции
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Понедельник — Пятница<br />
              09:00 — 18:00 (МСК)
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Мы стараемся отвечать на все обращения в течение 1-2 рабочих дней.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="prose prose-lg max-w-none">
        <h2>Как с нами связаться</h2>

        <h3>Предложить новость</h3>
        <p>
          Если вы хотите предложить тему для публикации или у вас есть эксклюзивная информация
          в области ветеринарной медицины, напишите на <a href="mailto:editor@vetmed.ru">editor@vetmed.ru</a>
          с темой письма «Предложение новости».
        </p>

        <h3>Исправление ошибок</h3>
        <p>
          Обнаружили неточность в наших материалах? Сообщите нам — мы ценим внимательность
          наших читателей и оперативно вносим исправления.
        </p>

        <h3>Сотрудничество</h3>
        <p>
          Мы открыты к партнёрству с ветеринарными клиниками, исследовательскими центрами,
          фармацевтическими компаниями и профессиональными организациями.
          Обсудим возможности сотрудничества на <a href="mailto:partner@vetmed.ru">partner@vetmed.ru</a>.
        </p>

        <h3>Подписка на рассылку</h3>
        <p>
          Хотите получать еженедельный дайджест главных новостей?
          Подпишитесь на нашу рассылку в футере сайта.
        </p>
      </div>
    </div>
  );
}
