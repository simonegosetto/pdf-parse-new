# Worker Threads - Problema PDF.js e Soluzione Alternativa

## 🚨 Problema Fondamentale

PDF.js ha una validazione rigida di `workerSrc` che **non può essere disabilitata** facilmente:

```javascript
// Dentro PDF.js
set workerSrc(value) {
  if (typeof value !== 'string') {
    throw new Error('Invalid `workerSrc` type.');
  }
  // ...
}
```

Quando PDF.js si carica in un worker thread Node.js, cerca di impostare `workerSrc` e fallisce.

## 💡 Soluzione Proposta: Child Processes

Invece di worker threads, uso **child processes** che:
- ✅ Isolamento completo (meglio dei worker)
- ✅ Nessun problema con PDF.js
- ✅ Comunicazione tramite IPC (veloce)
- ✅ Stesso livello di parallelismo

### Architettura

```
Main Process          Child 1           Child 2           Child 3
│                     │                 │                 │
├─ Spawn children     │                 │                 │
├─ Send chunk 1  ────►│                 │                 │
├─ Send chunk 2  ─────────────────────►│                 │
├─ Send chunk 3  ───────────────────────────────────────►│
│                     │                 │                 │
│                     ├─ Parse pages    │                 │
│                     │                 ├─ Parse pages    │
│                     │                 │                 ├─ Parse pages
│                     │                 │                 │
◄─────────────────────┴─────────────────┴─────────────────┘
│
└─ Combine results
```

## 🔄 Implementazione

### pdf-parse-processes.js (NUOVO)

Usa `child_process.fork()` invece di `Worker`:

```javascript
const { fork } = require('child_process');

async function PDFProcesses(dataBuffer, options) {
  const children = [];
  const results = [];

  // Spawn child processes
  for (let i = 0; i < numCores; i++) {
    const child = fork('./lib/pdf-child.js');
    children.push(child);
  }

  // Distribute work
  chunks.forEach((chunk, index) => {
    const child = children[index % children.length];
    child.send({
      dataBuffer: dataBuffer.toString('base64'),
      startPage: chunk.start,
      endPage: chunk.end
    });
  });

  // Collect results
  // ...
}
```

### pdf-child.js (NUOVO)

Child process che usa PDF.js normalmente:

```javascript
const PDFJS = require('./pdf.js/v4.5.136/build/pdf.js');

process.on('message', async (msg) => {
  const buffer = Buffer.from(msg.dataBuffer, 'base64');

  PDFJS.disableWorker = true;
  const doc = await PDFJS.getDocument({ data: buffer }).promise;

  // Parse pages...

  process.send({
    success: true,
    text: result
  });
});
```

## 📊 Vantaggi Child Processes vs Worker Threads

| Feature | Worker Threads | Child Processes |
|---------|---------------|-----------------|
| Isolamento | Shared memory | Completo ✅ |
| PDF.js compatibility | ❌ Problemi | ✅ Funziona |
| Startup overhead | Basso | Medio |
| Memory overhead | Basso | Medio |
| Communication | Structured clone | IPC (serialization) |
| Debugging | Difficile | Facile ✅ |

## ⚡ Performance Attese

Simile ai worker threads (overhead leggermente maggiore ma trascurabile):

```
File 9000 pagine:
- Sequential: 49s
- Processes (4): ~19-20s (+60%)  ✅
```

## 🛠️ Implementazione Rapida

Devo creare:
1. `lib/pdf-parse-processes.js` - Manager
2. `lib/pdf-child.js` - Child process
3. Aggiornare `index.js` per esportare

## 🎯 Decisione

**Abbandono worker threads** (troppi problemi con PDF.js)
**Implemento child processes** (soluzione robusta e affidabile)

Vuoi che proceda con questa implementazione? È la soluzione **più robusta e professionale**.

