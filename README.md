# filebrowser
Минималистичный проект, демонстрирующий принципы работы с node.js с поясняющими комментариями.

Весь фронтэнд - в файле index.html, весь бэкэнд - в файле nodeserver.js из соображений лаконичности учебного примера.

Сайт обращается к node-скрипту, который крутится на 10009-м порту моего домашнего сервера (стабильность его работы не гарантирую).

Если вы хотите воспроизвести проект у себя на локальной машине - в файле index.html задайте apihost="localhost:10009", а в файле nodeserver.js в config.localdir укажите папку, файлы которой будут просматриваться.

Серверный скрипт сделан по большей части на стандатрных модулях node.js, единственный сторонний модуль - mongodb для хранения комментариев. Для работы с ним на машине должна быть установлена сама база данных MongoDB и node-модуль mongodb.
P.S. Это мой первый опыт работы с mongodb, не судите строго.
