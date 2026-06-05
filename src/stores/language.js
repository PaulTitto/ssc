import { defineStore } from 'pinia'

export const useLanguageStore = defineStore({
  id: 'language',
  state: () => ({
    locale: {
      native: "Bahasa Indonesia",
      en: "Indonesian",
      code: "in",
      flag: "🇮🇩",
    }
  }),
  getters: {
    code(state) {
      return state.locale.code
    }
  },
  persist: true
})