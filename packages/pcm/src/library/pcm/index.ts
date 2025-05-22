import Recorder from './core/recorder';
import Player from './core/player';
import type { PlayerConfig, RecorderConfig } from './core/type';

interface GetUserMedia {
  (
    constraints?: MediaStreamConstraints,
    resolve?: (stream: MediaStream) => void,
    reject?: (error: Error) => void
  ): void,
}
declare const navigator: {
  getUserMedia: GetUserMedia,
  webkitGetUserMedia: GetUserMedia,
  mozGetUserMedia: GetUserMedia,
  mediaDevices: { getUserMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>; }
};

interface PCMConfig {
  // 播放器配置
  player?: PlayerConfig,
  // 录音器配置
  recorder?: RecorderConfig,
  // 播放与录音是否平行处理
  parallel?: boolean,
  // socket地址
  wsUrl?: string
}
export default class PCM {
  // 播放器
  private player: Player

  // 录音器
  private recorder: Recorder

  // 播放器状态
  private recordStatus: 'recording' | 'stop' = 'stop'

  // 录音器状态
  private playerStatus: 'playing' | 'stop' = 'stop'

  // socket实例
  private ws: WebSocket | null = null

  // socket地址
  private wsUrl: string | undefined

  constructor(options: PCMConfig = {}) {
    PCM.initUserMedia();
    this.player = new Player(options.player);
    this.recorder = new Recorder(options.recorder, options.parallel);
    this.wsUrl = options.wsUrl;
  }

  /**
   * getUserMedia版本兼容处理
   */
  static initUserMedia() {
    if (!navigator.mediaDevices) navigator.mediaDevices = {};
    if (!navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia = (constraints?: MediaStreamConstraints) => {
        const getUserMedia = navigator.getUserMedia
          || navigator.webkitGetUserMedia
          || navigator.mozGetUserMedia;
        if (!getUserMedia) return Promise.reject(new Error('browser does not support getUserMedia.'));
        return new Promise((
          resolve: (stream: MediaStream) => void,
          reject: (error: Error) => void,
        ) => {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      };
    }
  }

  /**
   * 获取权限
   * @returns {Promise}
   */
  static getPermission() {
    PCM.initUserMedia();
    return navigator.mediaDevices
      .getUserMedia?.({ audio: true })
      .then((stream: MediaStream) => {
        stream?.getTracks().forEach((track) => track.stop());
      }) || Promise.reject();
  }

  /**
   * 获取socket实例
   * @returns {WebSocket}
   */
  private getWs(): WebSocket {
    const { wsUrl } = this;
    if (!wsUrl) throw new Error('wsUrl cannot be empty.');
    const ws = this.ws || new WebSocket(wsUrl);
    ws.onerror = () => {
      if ([ws.CLOSING, ws.CLOSED].includes(ws.readyState)) {
        this.stopReceiveAudio();
        this.stopPushRecord();
      }
    };
    ws.binaryType = 'arraybuffer';
    return ws;
  }

  /**
   * 刷新socket，根据情况自动销毁关闭
   * @returns {void}
   */
  private flushWs(): void {
    if (this.playerStatus === 'playing' || this.recordStatus === 'recording' || !this.ws) return;
    this.ws.close();
    this.ws = null;
  }

  /**
   * 更新socket地址
   * @param {string} wsUrl socket地址
   * @returns {void}
   */
  updateWsUrl(wsUrl: string): void {
    this.wsUrl = wsUrl;
    if (!this.ws) return;
    const { recordStatus, playerStatus } = this;
    if (recordStatus === 'recording') this.stopPushRecord();
    if (playerStatus === 'playing') this.stopReceiveAudio();
    if (recordStatus === 'recording') this.startPushRecord();
    if (playerStatus === 'playing') this.startReceiveAudio();
  }

  /**
   * 开始推送录音
   */
  startPushRecord() {
    this.ws = this.getWs();
    this.recordStatus = 'recording';
    this.recorder.onprogress = (pcm) => {
      this.ws?.send(pcm.buffer);
    };
    this.recorder.startRecord();
  }

  /**
   * 停止推送录音
   */
  stopPushRecord() {
    this.recordStatus = 'stop';
    this.recorder.onprogress = undefined;
    this.recorder.stopRecord();
    this.flushWs();
  }

  /**
   * 开始接收音频
   */
  startReceiveAudio() {
    this.ws = this.getWs();
    this.playerStatus = 'playing';
    this.ws.onmessage = ({ data }) => {
      this.player.play(<ArrayBuffer>data);
    };
  }

  /**
   * 停止接收音频
   */
  stopReceiveAudio() {
    this.playerStatus = 'stop';
    if (this.ws) this.ws.onmessage = null;
    this.player.pause();
    this.flushWs();
  }

  /**
   * 销毁
   */
  destroy() {
    this.stopPushRecord();
    this.stopReceiveAudio();
    this.player.destroy();
    this.recorder.destroyRecord();
  }
}
