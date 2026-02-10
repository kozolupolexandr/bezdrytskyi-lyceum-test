# Бездрицький ліцей — Список завдань

## Статус перекладу

### Перекладено
- [x] Головна сторінка (data/en/homepage.yml)
- [x] Назви місяців (data/en/months.yml)
- [x] Блог — 6 статей + індекс
- [x] Курси/Предмети — 6 предметів + індекс
- [x] Про нас (about/_index.md)
- [x] Контакти (contact/_index.md)
- [x] Події — 6 подій + індекс
- [x] Оголошення — 6 оголошень + індекс
- [x] Дослідження — 6 проєктів + індекс
- [x] Досягнення/Нагороди — 3 сторінки + індекс
- [x] Автори — 2 файли
- [x] Меню навігації (menus.en.toml)
- [x] Конфігурація (hugo.toml, languages.toml)

### НЕ перекладено (Lorem ipsum)
- [x] Вчителі — Lorem ipsum відсутній у всіх 6 файлах; контент україномовний

---

## ПРІОРИТЕТ 1 — Критичні проблеми

### 1. Відсутні файли перекладу інтерфейсу (i18n)
- [x] Створити файл `i18n/en.toml` з перекладами 27 рядків інтерфейсу теми:
  - `see_all` → "Переглянути всі"
  - `duration` → "Тривалість"
  - `weekly` → "Годин на тиждень"
  - `fee` → "Вартість"
  - `apply_now` → "Подати заявку"
  - `teacher` → "Вчитель"
  - `contact_info` → "Контактна інформація"
  - `related_course` → "Схожі предмети"
  - `location` → "Місце проведення"
  - `date` → "Дата"
  - `time` → "Час"
  - `entry_fee` → "Вхід"
  - `event_speaker` → "Спікери"
  - `more_event` → "Більше подій"
  - `our_teachers` → "Наші вчителі"
  - `contact_us` → "Зв'яжіться з нами"
  - `send` → "Надіслати"
  - `posted_by` → "Автор"
  - `subscribe_newsletter` → "Підписатися на новини"
  - `enter_email` → "Введіть email"
  - `join` → "Підписатися"
  - `company` → "Про ліцей"
  - `links` → "Посилання"
  - `courses` → "Предмети"
  - `new_notice` → "Нові оголошення"
  - `call` → "Телефон"
  - `email` → "Пошта"
- [x] Додано додаткові ключі i18n, які використовує тема: `read_more`, `download`, `latest_article`, `categories`, `category`, `tags`, `all`, `interest`

### 2. Доперекласти 4 файли вчителів
- [ ] alex-rook.md → Олена Петрівна Коваленко (Українська мова)
- [ ] clark-malik.md → Іван Миколайович Шевченко (Математика)
- [ ] devid-luis.md → Наталія Сергіївна Бондаренко (Англійська мова)
- [ ] zim-cook.md → Андрій Ігорович Лисенко (Інформатика)

### 3. Відсутні зображення вчителів
- [x] Додано заглушки для `images/teachers/teacher-1.jpg` … `teacher-6.jpg` (однакові placeholder-зображення)
- [x] Скопійовано в `static/images/teachers/` для коректного відображення через `absURL`

### 3.1. Відсутні зображення для подій і блогу
- [x] Події: додано заглушки для `images/events/event-4.jpg`, `images/events/event-5.jpg`, `images/events/event-6.jpg`
- [x] Блог: додано заглушки для `images/blog/post-4.jpg`, `images/blog/post-5.jpg`, `images/blog/post-6.jpg`

### 4. Порожні контактні дані
- [x] `hugo.toml` → `mobile` — вказано телефон ліцею: +380952511181
- [x] `hugo.toml` → `email` — вказано email ліцею: bezdryk_school@ukr.net
- [x] `hugo.toml` → `address` — додано повну адресу: 42350, вул. Жовтнева, 37, с. Бездрик, Сумський р-н, Сумська область, Україна

---

## ПРІОРИТЕТ 2 — Середні проблеми

### 5. Посилання-заглушки "#"
- [ ] Соціальні мережі в hugo.toml — Facebook стоїть "#", потрібна реальна сторінка
- [ ] `contact_form_action = "#"` — потрібен endpoint для форми (напр. Formspree)
- [ ] `apply_url = "#"` у 6 файлах курсів
- [ ] `apply_url = "#"` у 6 файлах подій
- [ ] `download_link = "#"` у 6 файлах оголошень
- [ ] Соцмережі у всіх файлах вчителів (Facebook, Twitter, Skype — все "#")
- [ ] Соцмережі у файлах авторів (john-doe.md, mark-dinn.md)

### 6. Захардкоджений англійський текст у темі
- [x] Форма контактів: `placeholder="Your Name"`, `"Your Email"`, `"Subject"`, `"Your Message"`
  - Файл: `themes/educenter-hugo/layouts/contact/list.html`
  - Рішення: створити override у `layouts/contact/list.html` з українськими placeholder
  - Виконано: override створено у `layouts/contact/list.html`

### 6.1. Зображення з `assets/images/` не відображаються
- [x] Шаблон `layouts/partials/image.html` використовує `absURL` і очікує файли у `static/images/...`
- [x] Варіант B: змінено partial на використання Hugo Pipes (`resources.Get`) для `assets/images/`

### 6.2. Формат дат англійський
- [x] Переведено формат дат на український числовий (`ДД.ММ.РРРР`) у блогах, подіях та оголошеннях
- [ ] Cookie-повідомлення: "This site uses cookies..." та кнопка "I Accept"
  - Файл: `themes/educenter-hugo/layouts/partials/footer.html`
  - Рішення: cookies вимкнено в конфігурації, тому не критично

---

## ПРІОРИТЕТ 3 — Низькі проблеми

### 7. Залишки французького контенту
- [x] Видалити директорію `data/fr/` (homepage.yml та months.yml — не використовуються)

### 8. Логотип та favicon
- [ ] Замінити `assets/images/logo.png` на логотип ліцею
- [ ] Замінити `assets/images/favicon.png` на favicon ліцею

### 9. Фото та зображення
- [ ] Замінити стокові фото у `assets/images/` на реальні фото ліцею:
  - banner/banner-1.jpg — фото школи
  - about/about-us.jpg, about-page.jpg — фото ліцею
  - teachers/ — фото реальних вчителів
  - events/ — фото шкільних подій
  - courses/ — фото навчального процесу
  - blog/ — фото для новин

### 10. Інше
- [ ] Перейменувати `content/english/` → `content/uk/` для ясності (потребує зміни в languages.toml)
- [ ] Видалити `data/fr/` та `config/_default/menus.fr.toml` (якщо існує)
- [ ] Перевірити YouTube відео у success_story (video_link) — замінити на відео ліцею
