<template>
  <v-app>
    <v-main>
      <router-view/>
    </v-main>
  </v-app>
</template>

<script>

export default {
  name: 'App',

  data: () => ({})
}
</script>

<style scoped>
.body {
  width: 100vw;
  text-align: center;
  height: 100vh;
}
</style>
