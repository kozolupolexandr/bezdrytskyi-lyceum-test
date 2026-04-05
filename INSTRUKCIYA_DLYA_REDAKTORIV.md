# Інструкція для редакторів сайту

## 1) Де знаходиться контент

- Основний контент: `content/ukrainian/`
- Зображення сайту: `static/images/`
- Файли для завантаження (PDF, DOCX): `static/Prozorist/`, `static/anti-bullying/`

## 2) Які типи сторінок ви редагуєте

- Новини: `content/ukrainian/blog/*.md`
- Оголошення: `content/ukrainian/notice/*.md`
- Події: `content/ukrainian/event/*.md`
- Вчителі: `content/ukrainian/teacher/*.md`
- Документи розділу "Прозорість та інформаційна відкритість": `content/ukrainian/about/*.md`
- Окремі статичні сторінки:
  - `content/ukrainian/prozorist.md`
  - `content/ukrainian/anti-bullying.md`
  - `content/ukrainian/contact.md`

## 3) Загальне правило редагування

1. Відкрийте потрібний `.md` файл.
2. Не видаляйте блок між `---` і `---` (це службові поля сторінки).
3. Редагуйте текст нижче другого `---`.
4. Збережіть файл.

## 4) Як створити новину

1. Скопіюйте будь-який файл із `content/ukrainian/blog/`.
2. Назвіть файл латиницею, наприклад змінивши число: `blog-post-6.md` або надавши унікальне ім'я `svyato-u-licei.md`.
3. Заповніть поля у верхньому блоці:
   - `title` - заголовок
   - `date` - дата і час публікації
   - `description` - короткий опис
   - `image` - головна картинка
   - `author` - ім'я автора як текст (наприклад: `Адміністрація`)
   - `categories` - категорії
   - `tags` - теги
   - `type: "post"` - залишайте обов'язково
4. Додайте текст новини.

Мінімальний шаблон:

```md
---
title: "Заголовок новини"
date: 2026-04-04T10:00:00+03:00
bg_image: "images/backgrounds/page-title.jpg"
description: "Короткий опис"
image: "images/blog/post-1.jpg"
author: "Адміністрація"
categories: ["Новини"]
tags: ["Подія"]
type: "post"
---

Текст новини...
```

## 5) Як створити оголошення

1. Скопіюйте файл з `content/ukrainian/notice/`.
2. Заповніть:
   - `title`, `date`, `description`
   - `type: "notice"` (залишайте)
   - `download_link` (якщо потрібна кнопка "Завантажити")
3. Додайте основний текст.

## 6) Як створити подію

1. Скопіюйте файл з `content/ukrainian/event/`.
2. Заповніть:
   - `title`, `date`, `description`, `image`
   - `location`, `fee`, `apply_url` (за потреби)
   - `type: "event"` (залишайте)
3. Додайте текст події.

## 7) Сторінка "Контакти"

Файл: `content/ukrainian/contact.md`

Окремі поля, які можна змінювати:
- `phone`
- `email`
- `address`

## 8) Як додати зображення в текст

### Варіант 1: звичайне Markdown-зображення

```md
![Підпис](/images/banner/banner-1.jpg)
```

### Варіант 2: шорткод `images` (рекомендовано)

Одна картинка:

```md
{{< images src="/images/banner/banner-1.jpg" alt="Банер" caption="Підпис" max="800px" >}}
{{< /images >}}
```

Карусель із кількох картинок:

```md
{{< images height="420" autoplay="true" dots="true" arrows="true" >}}
/images/banner/banner-1.jpg|Фото 1
https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=1200&q=80|Фото 2
{{< /images >}}
```

Формат рядка в каруселі:
- `шлях_до_зображення|підпис`

Що робить шорткод:
- обмежує ширину, щоб фото не ламало верстку;
- для кількох фото робить карусель + мініатюри;
- при кліку відкриває збільшення (оверлей) поверх сторінки.

## 9) Як додати PDF/DOCX

1. Скопіюйте файл у `static/Prozorist/` або `static/anti-bullying/`.
2. Додайте посилання у тексті:

```md
[Завантажити документ](/Prozorist/nazva-failu.pdf)
```

## 10) Як правильно формувати шляхи до файлів і зображень

Загальне правило:
- якщо файл лежить у `static/...`, у markdown використовуйте шлях від кореня сайту, тобто з `/`.

### Шляхи до зображень

Правильно:
- `/images/banner/banner-1.jpg`
- `/images/blog/post-1.jpg`

Неправильно:
- `images/banner/banner-1.jpg` (без `/` на початку)
- `C:\Users\...` (локальний шлях з комп'ютера)

Приклад:

```md
![Фото ліцею](/images/banner/banner-1.jpg)
```

### Шляхи до документів (PDF/DOCX)

Якщо файл у `static/Prozorist/plan.pdf`, посилання має бути:

```md
[Завантажити план](/Prozorist/plan.pdf)
```

Якщо файл у `static/anti-bullying/rules.pdf`, посилання має бути:

```md
[Правила](/anti-bullying/rules.pdf)
```

### Шляхи у шорткоді `images`

Для локального зображення:

```md
{{< images src="/images/banner/banner-1.jpg" caption="Підпис" >}}
{{< /images >}}
```

Для каруселі:

```md
{{< images >}}
/images/banner/banner-1.jpg|Фото 1
/images/blog/post-1.jpg|Фото 2
{{< /images >}}
```

### Внутрішні сторінки

Для посилання на сторінку використовуйте URL сторінки з `/`:

```md
[Контакти](/contact/)
[Прозорість](/prozorist/)
```

Важливо:
- використовуйте латиницю в назвах файлів, без пробілів;
- замість пробілів використовуйте `-`;
- перевіряйте регістр букв (наприклад, `Prozorist` і `prozorist` - це різні шляхи).

## 11) Чого не потрібно редагувати

Якщо немає технічного завдання, не змінюйте:
- `layouts/`
- `themes/`
- `assets/`
- `config/`
