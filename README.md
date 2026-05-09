# Student Portal v2

A production-grade React reference implementation in **TypeScript**, built around five engineering pillars:

1. **Multi-page routing** 
2. **REST data layer** — local mock API (`server.mjs`) proxied through Vite, wrapped in a typed fetch client with `AbortController` cancellation.
3. **CRUD** — full create / read / update / delete on students.
4. **Global state** — `Context + useReducer` (clean, predictable transitions; no Redux needed for this scope).
5. **Reusable hooks + Error boundaries + Suspense loaders** — production patterns rather than toy code.

---

<img width="1265" height="538" alt="Screenshot 2026-05-09 202519" src="https://github.com/user-attachments/assets/26bf6258-9657-4657-92d2-88bf68f01259" />
<img width="1361" height="580" alt="image" src="https://github.com/user-attachments/assets/ef0db919-5245-4b90-8926-26e6d2e372b8" />
<img width="944" height="527" alt="Screenshot 2026-05-07 015041" src="https://github.com/user-attachments/assets/fd44fd37-0dbe-495a-b133-4fd4cb96edac" />
<img width="732" height="524" alt="Screenshot 2026-05-09 191730" src="https://github.com/user-attachments/assets/d9e1d39d-2f48-4ca8-8b62-aa519fd92fac" />
<img width="1175" height="441" alt="Screenshot 2026-05-09 202439" src="https://github.com/user-attachments/assets/4b6d1a7a-9287-4289-b145-a17e6555bfff" />
<img width="807" height="401" alt="Screenshot 2026-05-09 202204" src="https://github.com/user-attachments/assets/7a4bedcd-3e62-4582-90c6-357606504bad" />
<img width="1173" height="397" alt="Screenshot 2026-05-09 202150" src="https://github.com/user-attachments/assets/4da37543-50b2-43ae-8f10-844a4c5e6a33" />
<img width="1238" height="454" alt="Screenshot 2026-05-09 201644" src="https://github.com/user-attachments/assets/782169f5-16cc-4ae4-9258-1d414ffe4241" />




## Performance optimization — the deep dive

### What we optimized

`<StudentList>` is the hot path: it re-renders on every keystroke in the search box, every filter change, and every state change in `<StudentsPage>`. Without care, typing one character recomputes filters and reconciles every card.

### The four-layer strategy

| Layer | Tool | What it bails out |
|---|---|---|
| 1. Input | `useDebounce` | Collapses keystroke bursts into one filter recompute |
| 2. Selectors | `useMemo` (in `useStudents`) | Filter + sort runs only when items or filter inputs change |
| 3. List | `React.memo(StudentList)` | List skips reconciliation when `students` & `onDelete` refs are stable |
| 4. Items | `React.memo(StudentCard)` | Each card skips reconciliation when its student didn't change |

