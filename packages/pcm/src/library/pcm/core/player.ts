import PCMPlayer from 'pcm-player';
import type { InputCodec, PlayerConfig } from './type';

export default class Player {
  private player: PCMPlayer

  constructor(options: PlayerConfig = {}) {
    this.player = new PCMPlayer({
      sampleRate: {
        8000: 8000,
        11025: 11025,
        16000: 16000,
        22050: 22050,
        24000: 24000,
        44100: 44100,
        48000: 48000,
      }[options.sampleRate || 8000] || 8000,
      channels: { 1: 1, 2: 2 }[options.channels || 1],
      inputCodec: <InputCodec>({ Int8: 'Int8', Int16: 'Int16' }[options.inputCodec || 'Int16'] || 'Int16'),
      flushTime: Math.max(200, options.flushTime || 0),
    });
    this.player.volume(1);
    this.player.pause();
  }

  play(buffer: ArrayBuffer) {
    this.player.feed(buffer);
    this.player.continue();
  }

  pause() {
    this.player.pause();
  }

  destroy() {
    this.player.destroy();
  }
}
