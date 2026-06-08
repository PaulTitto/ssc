<script setup>
import {
  ref,
  computed,
  nextTick,
  onMounted
} from 'vue'

import { useRoute } from 'vue-router'
import { marked } from 'marked'

const route = useRoute()

const API =
  import.meta.env.VITE_API_URL

const isOpen = ref(false)

const question = ref('')

const messages = ref([])

const isStreaming = ref(false)

const ragReady = ref(false)

const statusText = ref('Connecting...')

const chatRef = ref(null)


const closeChat = () => {

isOpen.value = false

messages.value = []

question.value = ''
}
/* =========================
   MEMORIZE MEMORI VERSE
========================= */

const isMemoryVerseDay = computed(() => {

if (!currentLesson.value)
  return false

return currentLesson.value.day === '01'
})


/* =========================
   DETECT CURRENT LESSON
========================= */

/* =========================
   DETECT CURRENT LESSON
========================= */
const currentLesson = computed(() => {
  const parts = route.path.split('/').filter(Boolean)

  if (parts.length < 2) return null

  return {
    quarterlyId: parts[1] || null,
    week: parts[2] || null,
    day: parts[3] ? parts[3].split('-')[0] : null
  }
})

const hasLessonContext = computed(() => {
  return currentLesson.value !== null && currentLesson.value.quarterlyId !== null
})
const hasDayContext = computed(() => {
  return currentLesson.value?.week && currentLesson.value?.day
})

const askSummary = () => {

if (!currentLesson.value)
  return

const {
  week,
  day
} = currentLesson.value

question.value =
  `Ringkas pelajaran minggu ${week} hari ${day}`

sendQuestion()
}

const askCore = () => {

if (!currentLesson.value)
  return

const {
  week,
  day
} = currentLesson.value

question.value =
  `Apa inti pelajaran minggu ${week} hari ${day}?`

sendQuestion()
}

const askVerse = () => {

if (!currentLesson.value)
  return

const {
  week,
  day
} = currentLesson.value

question.value =
  `Apa ayat hafalan minggu ${week} hari ${day}?`

sendQuestion()
}

/* =========================
   CITATION
========================= */

const parseDocId = (docId) => {

  const m = docId.match(
    /(\d{4})-q(\d+)-w(\d+)-d(\d+)/
  )

  if (!m) return null

  const year = m[1]

  const quarter =
    m[2].padStart(2, '0')

  const week =
    m[3].padStart(2, '0')

  const day =
    m[4].padStart(2, '0')

  const quarterlyId =
    `${year}-${quarter}`

  return {

    label:
      `📖 Mg ${parseInt(week)} · Hr ${parseInt(day)}`,

    webUrl:
      `https://ss.developedbytoo.me/in/${quarterlyId}/${week}/${day}`
  }
}

const injectCitations = (html) => {

  return html.replace(
    /\[(\d{4}-q\d+-w\d+-d\d+)\]/g,
    (_, docId) => {

      const p = parseDocId(docId)

      if (!p) return `[${docId}]`

      return `
        <a
          class="citation-badge"
          href="${p.webUrl}"
          target="_blank"
        >
          ${p.label}
        </a>
      `
    }
  )
}

/* =========================
   SCROLL
========================= */

const scrollBottom = async () => {

  await nextTick()

  if (chatRef.value) {
    chatRef.value.scrollTop =
      chatRef.value.scrollHeight
  }
}

/* =========================
   SEND QUESTION
========================= */

const sendQuestion = async () => {

if (
  !question.value.trim() ||
  isStreaming.value
) return

const q = question.value

question.value = ''

isStreaming.value = true

messages.value.push({
  role: 'user',
  text: q
})

messages.value.push({
  role: 'bot',
  text: ''
})

const botIndex = messages.value.length - 1

scrollBottom()

try {

  const resp = await fetch(
    API + '/ask',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: q
      })
    }
  )

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()

  let fullText = ''
  let buffer = ''

  while (true) {

    const { done, value } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() // baris terakhir mungkin belum lengkap

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      const chunk = line.slice(6)

      if (chunk === '[DONE]') break

      fullText += chunk
    }

    messages.value[botIndex].text =
      injectCitations(marked.parse(fullText))

    scrollBottom()
  }

} catch {

  messages.value[botIndex].text =
    'Gagal terhubung ke server.'

} finally {

  isStreaming.value = false
}
}

/* =========================
   HEALTH
========================= */

const checkHealth = async () => {

  try {

    const r = await fetch(
      API + '/health'
    )

    const d = await r.json()

    ragReady.value = d.rag_ready

    statusText.value =
      d.rag_ready
        ? 'AI Ready'
        : 'Initializing...'

  } catch {

    statusText.value =
      'Offline'
  }
}

onMounted(() => {
  checkHealth()
})
</script>



<template>

  <div class="chatbot-wrapper">
  
      <button
        v-if="!isOpen"
        class="chatbot-button"
        @click="isOpen = true"
      >
  
      <!-- OPEN ICON -->
      <svg
        v-if="!isOpen"
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        />
      </svg>
  
      <!-- CLOSE ICON -->
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line
          x1="18"
          y1="6"
          x2="6"
          y2="18"
        />
  
        <line
          x1="6"
          y1="6"
          x2="18"
          y2="18"
        />
      </svg>
  
    </button>
  
    <!-- CHAT WINDOW -->
    <div
      v-if="isOpen"
      class="chat-window"
    >
  
      <!-- HEADER -->
      <!-- HEADER -->
    <div class="chat-header">
    
    <div>
    
      <div class="chat-title">

      <span class="title-icon">✨</span> Reading Assistant 
      </div>
    
      <!-- <div class="chat-subtitle">
        SABOT AI
      </div> -->
    
    </div>

<div class="header-actions">

  <!-- MINIMIZE -->
  <button
    class="header-btn"
    @click="isOpen = false"
  >
    ─
  </button>

  <!-- CLOSE -->
  <button
    class="header-btn"
    @click="closeChat"
  >
    ✕
  </button>

</div>

</div>
  
      <!-- DEBUG -->
      <!-- <div
        style="
          padding:8px 16px;
          font-size:12px;
          border-bottom:1px solid #eee;
        "
      >
        {{ currentLesson }}
      </div> -->
  
      <!-- EMPTY STATE -->
      <div
        v-if="messages.length === 0"
        class="empty-state"
      >
  
        
  
        <!-- QUICK ACTION -->
        <!-- QUICK ACTION -->
        <div v-if="hasDayContext" class="quick-actions">
  <button @click="askSummary">✨ Ringkas Pelajaran Ini</button>
  <button @click="askCore">📚 Inti Pelajaran</button>
  <button v-if="isMemoryVerseDay" @click="askVerse">📖 Ayat Hafalan</button>
</div>
  
      </div>
  
      <!-- CHAT BODY -->
      <div
        ref="chatRef"
        class="chat-body"
      >
  
        <div
          v-for="(msg, i) in messages"
          :key="i"
          :class="[
            'message-row',
            msg.role
          ]"
        >
  
          <div
            :class="[
              'message-bubble',
              msg.role
            ]"
            v-html="msg.text"
          />
  
        </div>
  
      </div>
  
      <!-- INPUT -->
      <form
        class="chat-input"
        @submit.prevent="sendQuestion"
      >
  
        <input
          v-model="question"
          placeholder="Ask about this lesson"
        />
  
        <button
          type="submit"
          :disabled="isStreaming"
        >
          ↑
        </button>
  
      </form>
  
    </div>
  
  </div>
  
  </template>
<style scoped>

.header-actions{
display:flex;
align-items:center;
gap:8px;
}

.header-btn{
width:32px;
height:32px;
border:none;
border-radius:10px;
background:transparent;
cursor:pointer;
font-size:18px;
color:#444;
transition:.2s;
}

.header-btn:hover{
background:rgba(0,0,0,.06);
}

.chatbot-wrapper {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999; /* Dinaikkan agar tidak tertimbun footer atau elemen portfolio */
  font-family: sans-serif;
}

.chatbot-button {
  /* Hapus position: fixed di sini karena pembungkusnya (.chatbot-wrapper) sudah fixed */
  position: relative; 
  width: 60px;  /* Sedikit diperkecil agar pas di layar HP */
  height: 60px; /* Sedikit diperkecil agar pas di layar HP */
  border: none;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4);
  transition: 0.2s;
}

.chatbot-button:hover {
  transform: scale(1.05);
}

@media (max-width: 600px) {
  .chatbot-wrapper {
    position: fixed !important;
    bottom: 16px !important;
    right: 16px !important; 
    left: auto !important;
    top: auto !important;
    z-index: 9999999 !important;
  }

  .chatbot-button {
    width: 50px !important;  
    height: 50px !important;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.5) !important;
  }
}

/* --- TAMPILAN DEFAULT (DESKTOP) --- */
.chat-window {
  position: fixed;
  right: 24px;
  bottom: 100px; /* Diubah dari top:50% agar posisi mulainya dari bawah, dekat tombol toggle */
  width: 460px;
  height: 720px;
  max-height: 80vh; /* Membatasi tinggi agar tidak meluap dari layar desktop kecil */
  background: white;
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .18);
  z-index: 99999;
}

/* --- TAMPILAN RESPONSIF (HP / MOBILE) --- */
@media (max-width: 600px) {
  .chat-window {
    right: 0 !important;
    bottom: 0 !important;
    top: 0 !important;
    transform: none !important;
    width: 100% !important;
    height: 100% !important;
    max-height: 100vh !important;
    border-radius: 0 !important; /* Menghilangkan rounded corner agar full screen di HP */
  }


}


.empty-state{
padding:24px;
border-bottom:1px solid #eee;
background:white;
}

.empty-title{
font-size:22px;
font-weight:700;
margin-bottom:8px;
}

.empty-subtitle{
font-size:14px;
color:#666;
margin-bottom:20px;
line-height:1.6;
}

.quick-actions{
display:flex;
flex-direction:column;
gap:12px;
}

.quick-title{
font-size:13px;
color:#666;
margin-bottom:4px;
}

.quick-actions button{
padding:14px;
border-radius:14px;
border:1px solid #dbeafe;
background:#eff6ff;
cursor:pointer;
text-align:left;
font-size:14px;
transition:.2s;
}

.quick-actions button:hover{
background:#dbeafe;
}

.chat-body{
flex:1;
overflow-y:auto;
padding:18px;
background:#fafafa;
}

.message-row{
display:flex;
margin-bottom:14px;
}

.message-row.user{
justify-content:flex-end;
}

.message-bubble{
max-width:80%;
padding:14px;
border-radius:16px;
line-height:1.7;
font-size:15px;
}

.message-bubble.user{
background:#dbeafe;
}

.message-bubble.bot{
background:white;
}

.chat-input{
display:flex;
padding:14px;
border-top:1px solid #eee;
gap:10px;
background:white;
}

.chat-input input{
flex:1;
padding:14px;
border-radius:14px;
border:1px solid #ddd;
outline:none;
}

.chat-input button{
width:48px;
border:none;
border-radius:12px;
background:#2563eb;
color:white;
cursor:pointer;
}

:deep(.citation-badge){
display:inline-flex;
padding:5px 10px;
border-radius:999px;
background:#eff6ff;
color:#2563eb;
font-size:12px;
text-decoration:none;
font-weight:600;
margin:0 2px;
}
.chat-header{
padding:18px;
border-bottom:1px solid #eee;
display:flex;
justify-content:space-between;
align-items:center;
}

.chat-title{
display:flex;
align-items:center;
gap:8px;

font-size:16px;
font-weight:700;
color:#111827;
}

.title-icon{
color:#9ca3af;
font-size:15px;
}
.chat-subtitle{
font-size:12px;
opacity:.7;
}

.status{
font-size:12px;
display:flex;
align-items:center;
gap:6px;
}

.status-dot{
width:8px;
height:8px;
background:red;
border-radius:50%;
}

.status-dot.ready{
background:#22c55e;
}

.quick-actions{
padding:16px;
border-bottom:1px solid #eee;
display:flex;
flex-direction:column;
gap:10px;
background:white;
}

.quick-title{
font-size:13px;
color:#666;
margin-bottom:4px;
}

.quick-actions button{
padding:14px;
border-radius:14px;
border:1px solid #dbeafe;
background:#eff6ff;
cursor:pointer;
text-align:left;
font-size:14px;
transition:.2s;
}

.quick-actions button:hover{
background:#dbeafe;
}

.chat-body{
flex:1;
overflow-y:auto;
padding:18px;
background:#fafafa;
}

.message-row{
display:flex;
margin-bottom:14px;
}

.message-row.user{
justify-content:flex-end;
}

.message-bubble{
max-width:80%;
padding:14px;
border-radius:16px;
line-height:1.7;
font-size:15px;
}

.message-bubble.user{
background:#dbeafe;
}

.message-bubble.bot{
background:white;
}

.chat-input{
display:flex;
padding:14px;
border-top:1px solid #eee;
gap:10px;
}

.chat-input input{
flex:1;
padding:14px;
border-radius:14px;
border:1px solid #ddd;
outline:none;
}

.chat-input button{
width:48px;
border:none;
border-radius:12px;
background:#2563eb;
color:white;
cursor:pointer;
}

:deep(.citation-badge){
display:inline-flex;
padding:5px 10px;
border-radius:999px;
background:#eff6ff;
color:#2563eb;
font-size:12px;
text-decoration:none;
font-weight:600;
margin:0 2px;
}
</style>