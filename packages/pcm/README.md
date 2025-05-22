# PCM
## Install

using npm:

```sh
npm install @qiaojun/pcm --save
```


## Usage

```js
import Pcm from 'pcm';
// socket地址
const wsUrl = 'ws://localhost:9090';
// 采样率(8000 | 11025 | 16000 | 22050 | 24000 | 44100 | 48000)
const sampleRate = 8000;
// 声道数(1 | 2)
const channels = 1;
// 播放与录音是否平行处理(true | false)
const parallel = false;
// 采样位数(16 | 8)
const sampleBits = 16;
// 采样位数对应编码格式('Int16' | 'Int8')
const inputCodec = `Int${sampleBits}`;
// 创建pcm实例
const pcm = new PCM({
  wsUrl,
  player: {
    inputCodec,
    sampleRate,
    channels,
  },
  recorder: {
    sampleBits,
    sampleRate,
    channels,
  },
  parallel,
});
// 开始推送录音
pcm.startPushRecord(); 
// 停止推送录音
pcm.stopPushRecord(); 
// 开始接收音频
pcm.startReceiveAudio(); 
// 停止接收音频
pcm.stopReceiveAudio(); 
// 销毁
pcm.destroy(); 
```
## Live Demo

using npm:

```sh
npm install
npm run serve
```

or using yarn:

```sh
yarn
yarn serve
```