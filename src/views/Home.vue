<template>
  <div class="home">
    <p-d-resume msg="Patrick O. Davlin"/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import PDResume from '@/components/PDResume.vue'; // @ is an alias to /src

@Component({
  components: {
    PDResume,
  },
})
export default class Home extends Vue {}
</script>
