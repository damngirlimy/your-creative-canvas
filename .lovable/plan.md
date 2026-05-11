# Plano — Édit · captura inteligente, lembretes e voz

Vou trabalhar em 4 frentes. Tudo client-side (sem backend ainda), aproveitando Web Speech API, Notifications API e o parser que já existe.

---

## 1. Captura rápida — edição antes de salvar + voz + criar evento

**Arquivo:** `src/components/QuickCapture.tsx` (refatorar)

### 1a. Preview editável
Hoje o preview é só leitura. Vou trocar por um mini-formulário inline que aparece assim que o parser entende algo:

- Título (input)
- Data (input date)
- Hora início + fim (inputs time)
- Categoria (select com as categorias do usuário)
- Repetição (none / daily / weekly — chips)
- Toggle **Tarefa ↔ Evento** (se evento, salva em `MonthEvent` ao invés de `Task`)
- Prioridade (○ ◐ ●)

O texto livre continua dirigindo o parser. Se o usuário editar manualmente um campo, esse campo vira "trancado" (não é sobrescrito por mudanças no texto). Botão "Adicionar" só dispara depois.

### 1b. Áudio (Web Speech API)
- Botão de microfone ao lado do input
- `webkitSpeechRecognition` em pt-BR, modo contínuo
- Transcrição alimenta o mesmo input → mesmo parser
- Estado visual: idle / ouvindo (pulse) / processando
- Fallback gracioso quando o navegador não suporta (esconde o botão e mostra dica)

### 1c. Cartão de ajuda
Pequeno bloco expandível "Como falar" com exemplos:
> "Treino perna amanhã às 18h por 1h, semanal, #treino"  
> "Reunião sexta 14:30 #trabalho"  
> "Evento: aniversário 25/12"

### 1d. Parser estendido (`src/lib/insights.ts`)
- Reconhecer prefixo **"evento:"** / **"marcar evento"** → retorna `kind: "event"`
- Reconhecer **prioridade** ("alta prioridade", "urgente", "baixa")
- Reconhecer **categoria por nome** (não só `#tag`): "categoria treino", "no trabalho"
- Mais sinônimos de repetição: "toda segunda", "todo dia útil"

---

## 2. FAB persistente + atalho de "colar e converter"

**Novo:** `src/components/FloatingAccess.tsx`

Botão flutuante no canto inferior direito (sempre visível, mesmo com QuickCapture fechado):
- Tap curto → abre QuickCapture
- Tap longo / segundo botão → abre **"Colar texto"**: textarea grande onde o usuário cola anotações de outro app (notas do YouTube, WhatsApp, etc). O parser quebra por linhas, gera uma lista de tarefas previstas, cada uma editável, com checkbox para selecionar quais importar em lote.

Layout: empilhado, recolhível, respeita safe-area do mobile.

---

## 3. Lembretes / notificações

**Novo:** `src/lib/reminders.ts` + integração em `src/routes/index.tsx`

- Pedir permissão `Notification.requestPermission()` na primeira interação (botão "Ativar lembretes" no header, não automático)
- Loop de verificação a cada 30s: dispara notificação quando faltarem **10 min** para uma tarefa/evento com `time`
- Marca em memória os IDs já notificados no dia (evita repetir)
- Banner in-app no topo para tarefas que começam nos próximos 60min (sempre visível mesmo sem permissão)
- Toast ao abrir o app listando o que ainda falta hoje

Limitação honesta: só funciona com a aba aberta (sem Service Worker / push real ainda). Vou deixar isso claro num tooltip "ⓘ funciona com o app aberto".

---

## 4. Horários livres mais inteligentes + responsividade

**Arquivo:** `src/components/FreeSlotsPanel.tsx`

- Cada slot livre ganha **sugestão**: usa `suggestForSlot()` (que já existe) + tarefas recorrentes não cumpridas hoje + categoria mais "esquecida" nos últimos 30 dias
- Texto: "Sugestão: treino (78% nos últimos 30d)" com botão "Agendar agora" que pré-preenche o QuickCapture
- "Reagendar" mais inteligente: ao clicar numa overdue, abre um pequeno popover com 3 sugestões automáticas (próximo slot livre hoje, amanhã mesmo horário, próxima semana mesmo dia)

Ajustes de responsividade:
- QuickCapture full-screen no mobile (<640px) ao invés de modal centralizado
- FAB desce um pouco quando teclado virtual abre (usar `visualViewport`)
- Grid de slots vira 1 coluna abaixo de 480px

---

## Estrutura técnica

```text
src/
├─ components/
│  ├─ QuickCapture.tsx          (refatorado: form editável + voz + tarefa/evento)
│  ├─ FloatingAccess.tsx        (NEW: FAB persistente + colar-texto)
│  ├─ ReminderBanner.tsx        (NEW: banner topo + permissão)
│  └─ FreeSlotsPanel.tsx        (sugestões inline + reagendar inteligente)
├─ hooks/
│  ├─ useSpeechRecognition.ts   (NEW: wrapper Web Speech API pt-BR)
│  └─ useReminders.ts           (NEW: loop 30s + notificações)
└─ lib/
   ├─ insights.ts               (parser estendido: kind, prioridade, categoria por nome)
   └─ reminders.ts              (NEW: lógica de quem notificar e quando)
```

## Fora do escopo desta rodada
- Sincronia entre dispositivos (precisa Cloudly)
- Push notifications reais com app fechado (precisa Service Worker + backend)
- Reconhecimento de voz por IA (Whisper/Gemini) — fica para quando ativarmos backend; o Web Speech API já entrega bem em pt-BR

Posso seguir?
