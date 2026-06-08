<!-- <script>
import { useLanguageStore } from '@/stores/language'
export default {
  created() {
    this.$router.push(`/${useLanguageStore().locale.code}`)
  }
}
</script>

<template></template> -->

<script>
export default {
  created() {
    this.$router.push('/in')
  }
}
</script>

<template></template>