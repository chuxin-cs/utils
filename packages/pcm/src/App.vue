<template>
  <div>
    <span>socket地址：</span>
    <input v-model="wsUrl" />
  </div>
  <div>
    <span>启用多线程：</span>
    <label for="parallel">
      <select v-model="parallel" id="parallel">
        <option :value="true">true</option>
        <option :value="false">false</option>
      </select>
    </label>
  </div>
  <div>
    <span>通道数：</span>
    <label for="channels">
      <select v-model="channels" id="channels">
        <option :value="1">1</option>
        <option :value="2">2</option>
      </select>
    </label>
  </div>
  <div>
    <span>采样率：</span>
    <label for="sampleRate">
      <select v-model="sampleRate" id="sampleRate">
        <option :value="8000">8000</option>
        <option :value="44100">44100</option>
        <option :value="48000">48000</option>
      </select>
    </label>
  </div>
  <div>
    <button @click="startPushRecord">开始录音推送</button>
    <button @click="stopPushRecord">停止录音推送</button>
  </div>
  <div>
    <button @click="startPullAudio">开始接收音频播放</button>
    <button @click="stopPullAudio">停止接收音频播放</button>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Ref } from 'vue';
import PCM from './library/pcm';
import type { Channels, SampleRate } from './library/pcm/core/type';

let pcm: PCM | null = null;
const wsUrl = ref('ws://localhost:9090');
const channels: Ref<Channels> = ref(1);
const sampleRate: Ref<SampleRate> = ref(8000);
const parallel = ref(false);
const getPCM = () => {
  pcm = pcm || new PCM({
    wsUrl: wsUrl.value,
    player: {
      inputCodec: 'Int16',
      sampleRate: sampleRate.value,
      channels: channels.value,
    },
    recorder: {
      sampleBits: 16,
      sampleRate: sampleRate.value,
      channels: channels.value,
    },
    parallel: parallel.value,
  });
  return pcm;
};
const startPushRecord = () => getPCM().startPushRecord();
const stopPushRecord = () => getPCM().stopPushRecord();
const startPullAudio = () => getPCM().startReceiveAudio();
const stopPullAudio = () => getPCM().stopReceiveAudio();
watch([wsUrl, channels, sampleRate, parallel], () => {
  getPCM().destroy();
  pcm = null;
});
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
