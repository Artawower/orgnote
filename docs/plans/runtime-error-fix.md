# Fix: RangeError "Invalid child in posBefore" in CodeMirror

## Что произошло

В рантайме упал редактор с ошибкой:

```
RangeError: Invalid child in posBefore
    posBefore
    posAtCoordsInline
    posAtCoords
    basicMouseSelection
    Ft.mousedown  ← пользователь кликнул мышкой
    initView (OrgEditor)
```

Пользователь кликнул мышкой в редакторе. CodeMirror попытался
вычислить позицию клика в документе через `posAtCoords` →
`posAtCoordsInline` → `posBefore`. Функция `posBefore` обходит
DOM-дерево вверх в поисках известного CodeMirror content-view узла.
Если на пути встречается DOM-узел, который CodeMirror не отслеживает,
она бросает `RangeError: Invalid child in posBefore`.

**Причина:** клик попал в DOM-элемент внутри мультилинейного виджета,
который CodeMirror не считает частью своего content-дерева. Это
происходит когда виджет рендерит DOM без атрибута
`contenteditable="false"`, либо когда диапазон виджета выходит за
пределы документа.

---

### Репозиторий и файлы

Всё находится в **`orgnote-client`**.

```
src/containers/RichEditor/widgets/
├── org-multiline-widget.ts      ← главный подозреваемый
├── multiline-widgets.ts         ← логика добавления/удаления виджетов
├── readonly-block-widget-crash.spec.ts  ← сюда добавляем тест
└── org-mode-decoration.ts       ← inline-виджеты (для справки)
```

---

### Task 1: Понять код

Прочитай эти два файла полностью:

1. `org-multiline-widget.ts` — класс `OrgMultilineWidget`:
   - Метод `toDOM()` — что именно рендерится в DOM
   - Метод `createDecoration()` — как виджет занимает диапазон документа
   - Флаги `block: true`, `inclusive: true`, `side: 0`

2. `multiline-widgets.ts` — функция `buildDecorations`:
   - Как вычисляется `start = orgNode.start + startOffset`
   - Как вычисляется `end = orgNode.end + endOffset`
   - Проверь: может ли `end` выйти за `state.doc.length`?

**Гипотезы для проверки:**

- Виджет рендерит DOM без `contenteditable="false"`, поэтому CodeMirror
  пытается навигироваться внутри него при клике
- Диапазон виджета (`orgNode.end + endOffset`) выходит за длину документа,
  что приводит к некорректному DOM при клике рядом с концом файла
- Виджет рендерит вложенные элементы, которые попадают в область
  отслеживания CodeMirror, но не зарегистрированы как content-view

- [x] Прочитать `org-multiline-widget.ts` полностью (toDOM, createDecoration, флаги)
- [x] Прочитать `multiline-widgets.ts` полностью (buildDecorations, вычисление start/end)
- [x] Проверить: может ли `end` выйти за `state.doc.length` (да — нет ограничения)
- [x] Проверить: отсутствует ли `contenteditable="false"` в `toDOM()` (да — отсутствует)
- [x] Задокументировать результаты: основная причина — отсутствие `contenteditable="false"` в wrap-элементе виджета

---

### Task 2: Написать падающий тест

**Добавь тест в:**
`src/containers/RichEditor/widgets/readonly-block-widget-crash.spec.ts`

Посмотри как устроены существующие тесты в этом файле — они:

1. Создают `EditorView` с нужными расширениями через `EditorState.create`
2. Монтируют в `container` (div в `document.body`)
3. Диспатчат события или обращаются к plugin
4. Проверяют через `expect`

**Что должен делать новый тест:**

```ts
test("mousedown on multiline widget does not throw RangeError", () => {
  // 1. Создать редактор с мультилинейным виджетом
  //    (можно использовать makeQuoteBlockWidget из существующих тестов)

  // 2. Найти DOM-элемент виджета в контейнере

  // 3. Симулировать mousedown на этом элементе:
  //    element.dispatchEvent(new MouseEvent('mousedown', {
  //      bubbles: true,
  //      cancelable: true,
  //      clientX: rect.left + rect.width / 2,
  //      clientY: rect.top + rect.height / 2,
  //    }));

  // 4. Проверить что ошибки не было:
  //    expect(() => { /* диспатч */ }).not.toThrow();
  //    или обернуть весь блок в expect().not.toThrow()

  view.destroy();
});
```

**Важно:** тест должен упасть ДО внесения исправления. Если тест
сразу проходит — ты воспроизвёл не ту проблему.

Запусти тест:

```bash
npx vitest run src/containers/RichEditor/widgets/readonly-block-widget-crash.spec.ts
```

- [x] Написать тест "mousedown on multiline widget does not throw RangeError"
- [x] Запустить тест и убедиться что он падает до исправления

---

### Task 3: Найти корень проблемы

После того как тест падает — ищи причину.

**Проверка 1: `contenteditable`**

Открой DevTools в браузере, найди DOM-элемент виджета. Проверь:

- Есть ли у него `contenteditable="false"`?
- Если нет — CodeMirror будет пытаться навигировать внутрь

В `org-multiline-widget.ts`, метод `toDOM()`:

```ts
const wrap = document.createElement("div");
// Проверь: добавляется ли сюда contenteditable="false"?
```

**Проверка 2: выход за границы документа**

В `multiline-widgets.ts`, функция `buildDecorations`:

```ts
const [startOffset, endOffset] = multilineWidget.showRangeOffset ?? [0, 0];
const start = orgNode.start + startOffset;
const end = orgNode.end + endOffset;
// Проверь: end <= state.doc.length?
```

Если `end > state.doc.length`, CodeMirror расположит виджет за
последним символом документа. При клике рядом с концом файла
`posBefore` сломается.

**Проверка 3: диапазон `inclusive: true`**

В `createDecoration()`:

```ts
Decoration.replace({
  widget,
  side: 0,
  inclusive: true, // ← это означает что курсор может "войти" в виджет
  block: true,
});
```

`inclusive: true` в блочном виджете может позволить курсору оказаться
внутри диапазона виджета, что при клике запутает `posAtCoords`.

- [x] Подтвердить root cause на основании падающего теста
- [x] Задокументировать какой именно вариант (A/B/C) является причиной: **Вариант A** — в `toDOM()` отсутствует `contenteditable="false"` на wrap-элементе. Тест падает с `expected null to be 'false'`, что подтверждает: CodeMirror пытается навигировать внутрь виджета при клике, так как DOM-элемент не помечен как non-editable.

---

### Task 4: Исправить

После того как понял причину, применяй **минимальное** исправление.

**Вариант A: добавить `contenteditable="false"`** (если причина в нём)

```ts
// org-multiline-widget.ts, метод toDOM()
const wrap = document.createElement("div");
wrap.setAttribute("contenteditable", "false"); // ← добавить
```

**Вариант B: ограничить диапазон виджета** (если выходит за doc.length)

```ts
// multiline-widgets.ts или org-multiline-widget.ts
const safeEnd = Math.min(end, state.doc.length);
```

**Вариант C: убрать `inclusive: true`** (если проблема в позиционировании)

```ts
Decoration.replace({
  widget,
  side: 0,
  inclusive: false, // ← изменить
  block: true,
});
```

Применяй варианты по одному. После каждого запускай тест — смотри
прошёл ли он.

- [x] Применить минимальное исправление (Вариант A — добавить contenteditable="false" в toDOM())
- [x] Проверить что тест из Task 2 теперь проходит

---

### Task 5: Убедиться что ничего не сломал

После того как тест прошёл:

```bash
# Запустить все тесты виджетов
npx vitest run src/containers/RichEditor/widgets/

# Запустить все тесты проекта
npx vitest run src/
```

Все тесты должны быть зелёными.

- [x] Запустить все тесты виджетов: `npx vitest run src/containers/RichEditor/widgets/`
- [x] Запустить все тесты проекта: `npx vitest run src/`
- [x] Убедиться что все тесты зелёные

---

### Справка: как работает CodeMirror `posBefore`

```
user clicks → mousedown event
  → basicMouseSelection
  → posAtCoords(view, coords)
  → posAtCoordsInline(view, coords)
  → posBefore(view, domNode)   ← здесь падает
      обходит parentNode вверх
      ищет узел в ContentView.get(node)
      если не находит → RangeError("Invalid child in posBefore")
```

CodeMirror отслеживает только те DOM-узлы, которые он сам создал
(линии, виджеты через WidgetType). Если в DOM оказывается чужой узел
в позиции где CodeMirror ожидает свой — `posBefore` не может
определить позицию и падает.

---

### Связанные файлы для чтения

- `src/containers/RichEditor/widgets/org-multiline-widget.ts`
- `src/containers/RichEditor/widgets/multiline-widgets.ts`
- `src/containers/RichEditor/widgets/readonly-block-widget-crash.spec.ts`
- Документация CodeMirror по виджетам:
  https://codemirror.net/docs/ref/#view.Decoration^replace
