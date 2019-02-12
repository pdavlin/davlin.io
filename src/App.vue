<template>
  <div id="app">
    <!-- <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div> -->
    <router-view/>
  </div>
</template>

<style lang="scss">
body {
  background-color: #1b1c20;
}
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #b9b4ac;
}
#nav {
  padding: 30px;
  a {
    font-weight: bold;
    color: #606060;
    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
