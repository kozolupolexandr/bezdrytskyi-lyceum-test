# Структура сторінок сайту

| # | Сторінка | URL | Контент-файли | Кількість |
|---|----------|-----|---------------|-----------|
| 1 | **Головна** | `/` | `data/en/homepage.yml` | 1 |
| 2 | **Прозорість (About)** — список | `/about/` | `content/english/about/_index.md` | 1 |
| 3 | **Прозорість** — окремі документи | `/about/{slug}/` | 24 .md файли (статут, ліцензія, кадри тощо) | 24 |
| 4 | **Протидія булінгу** | `/anti-bullying/` | `content/english/anti-bullying/_index.md` | 1 |
| 5 | **Вчителі** — список | `/teacher/` | `content/english/teacher/_index.md` | 1 |
| 6 | **Вчитель** — профіль | `/teacher/{name}/` | 25 .md файлів | 25 |
| 7 | **Предмети (Courses)** — список | `/course/` | `content/english/course/_index.md` | 1 |
| 8 | **Предмет** — окремий | `/course/{slug}/` | 6 .md файлів | 6 |
| 9 | **Блог/Новини** — список | `/blog/` | `content/english/blog/_index.md` | 1 |
| 10 | **Блог** — окремий пост | `/blog/{slug}/` | 6 .md файлів | 6 |
| 11 | **Події** — список | `/event/` | `content/english/event/_index.md` | 1 |
| 12 | **Подія** — окрема | `/event/{slug}/` | 6 .md файлів | 6 |
| 13 | **Оголошення** — список | `/notice/` | `content/english/notice/_index.md` | 1 |
| 14 | **Оголошення** — окреме | `/notice/{slug}/` | 6 .md файлів | 6 |
| 15 | **Дослідження** — список | `/research/` | `content/english/research/_index.md` | 1 |
| 16 | **Дослідження** — окреме | `/research/{slug}/` | 6 .md файлів | 6 |
| 17 | **Досягнення (Scholarship)** — список | `/scholarship/` | `content/english/scholarship/_index.md` | 1 |
| 18 | **Досягнення** — окреме | `/scholarship/{slug}/` | 3 .md файли | 3 |
| 19 | **Контакти** | `/contact/` | `content/english/contact/_index.md` | 1 |
| 20 | **Автор** — профіль | `/author/{name}/` | 2 .md файли | 2 |
| 21 | **Категорії** (авто) | `/categories/{slug}/` | Генерується з тегів постів | — |
| 22 | **Теги** (авто) | `/tags/{slug}/` | Генерується з тегів постів | — |
| 23 | **404** | `/404.html` | Шаблон теми | 1 |

## Підсумок

- **15 унікальних типів сторінок** (list + single + homepage + 404)
- **~95 markdown-файлів** загалом
- **10 секцій** з `_index.md` (list-сторінки)
- **~85 окремих контентних сторінок** (single)

Найбільші секції за кількістю контенту: **Вчителі (25)** та **Документи прозорості (24)**.
