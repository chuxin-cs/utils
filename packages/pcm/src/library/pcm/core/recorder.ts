import { transformIntoPCM } from './transform';
import createRecorderProcessor from './recorder.processor';
import type {
  Channels, RecorderConfig, SampleBits, SampleRate,
} from './type';

declare const window: Window & {
  AudioContext: typeof AudioContext,
  webkitAudioContext: typeof AudioContext,
};
export default class Recorder {
  private context: AudioContext | undefined;

  private analyser: AnalyserNode | undefined;

  private audioInput: MediaStreamAudioSourceNode | undefined;

  private recorder: ScriptProcessorNode | undefined;

  private recorderNode: AudioWorkletNode | undefined;

  // 流
  private stream: MediaStream | undefined;

  // 由于safari问题，导致使用该方案代替disconnect/connect方案
  private needRecord = true;

  // 配置
  protected config: RecorderConfig;

  // 启用AudioWork
  protected enableAudioWork: boolean;

  // 输入采样率
  protected inputSampleRate: number;

  // 输入采样位数
  protected inputSampleBits = 16;

  // 输出采样率
  protected outputSampleRate: number;

  // 输出采样位数
  protected outputSampleBits: number;

  // 是否是小端字节序
  protected littleEndian: boolean;

  // 音频录制数据响应
  public onprogress: ((data: DataView) => void) | undefined;

  /**
   * 构造器
   * @param {RecorderConfig} options 配置项
   * @param {boolean} enableAudioWork 启用音频独立线程工作
   */
  constructor(options: RecorderConfig = {}, enableAudioWork = false) {
    // 临时audioContext，为了获取输入采样率的
    const context = new (window.AudioContext || window.webkitAudioContext)();
    // 获取当前输入的采样率
    this.inputSampleRate = context.sampleRate;
    this.enableAudioWork = enableAudioWork;
    // 设置输出配置
    this.config = {
      // 采样数位 8, 16
      sampleBits: <SampleBits>({ 8: 8, 16: 16 }[options.sampleBits || 16] || 16),
      // 采样率
      sampleRate: <SampleRate>({
        8000: 8000,
        11025: 11025,
        16000: 16000,
        22050: 22050,
        24000: 24000,
        44100: 44100,
        48000: 48000,
      }[options.sampleRate || this.inputSampleRate] || this.inputSampleRate),
      // 声道数，1或2
      channels: <Channels>({ 1: 1, 2: 2 }[options.channels || 1] || 1),
    };
    // 设置采样的参数
    this.outputSampleRate = <number> this.config.sampleRate;
    this.outputSampleBits = <number> this.config.sampleBits;
    // 判断端字节序
    this.littleEndian = (() => {
      const buffer = new ArrayBuffer(2);
      new DataView(buffer).setInt16(0, 256, true);
      return new Int16Array(buffer)[0] === 256;
    })();
  }

  /**
   * 开始录音
   * @returns {Promise}
   */
  startRecord(): Promise<unknown> {
    if (this.context) {
      // 关闭先前的录音实例，因为前次的实例会缓存少量前次的录音数据
      this.destroyRecord();
    }
    // 初始化
    this.initRecorder();
    return navigator.mediaDevices.getUserMedia({
      audio: true,
    }).then((stream: MediaStream) => {
      // audioInput表示音频源节点
      this.audioInput = this.context?.createMediaStreamSource(stream);
      this.stream = stream;
    }).then(() => {
      // audioInput 为声音源，连接到处理节点recorder
      if (this.analyser) this.audioInput?.connect(this.analyser);
      if (this.recorder) this.analyser?.connect(this.recorder);
      // 处理节点 recorder 连接到扬声器
      if (this.recorder && this.context?.destination) {
        this.recorder.connect(this.context?.destination);
      }
    });
  }

  /**
   * 暂停录音
   */
  pauseRecord(): void {
    this.needRecord = false;
  }

  /**
   * 继续录音
   */
  resumeRecord(): void {
    this.needRecord = true;
  }

  /**
   * 停止录音
   */
  stopRecord(): void {
    this.audioInput?.disconnect();
    this.recorder?.disconnect();
    this.recorderNode?.disconnect();
    this.analyser?.disconnect();
    this.needRecord = true;
  }

  /**
   * 销毁录音对象
   */
  destroyRecord() {
    this.clearRecordStatus();
    this.stopStream();
    return this.closeAudioContext();
  }

  getAnalyseData() {
    if (!this.analyser) return null;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    // 将数据拷贝到dataArray中。
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  /**
   * 清除状态
   */
  private clearRecordStatus() {
    this.audioInput = undefined;
    this.recorder = undefined;
    this.recorderNode = undefined;
    this.analyser = undefined;
  }

  /**
   * 初始化录音实例
   */
  private initRecorder(): void {
    this.clearRecordStatus();
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    // 录音分析节点
    this.analyser = this.context.createAnalyser() || null;
    // 表示存储频域的大小
    if (this.analyser) this.analyser.fftSize = 2048;
    if (this.enableAudioWork && this.context.audioWorklet) {
      const { url, name } = createRecorderProcessor(
        this.inputSampleRate,
        this.outputSampleRate,
        this.outputSampleBits,
        this.config.channels as 1 | 2,
        this.littleEndian,
      );
      this.context.audioWorklet.addModule(url).then(() => {
        const { context } = this;
        if (!context) return;
        const audioNode = new AudioWorkletNode(context, name);
        this.analyser?.connect(audioNode);
        audioNode.connect(context.destination);
        audioNode.port.onmessage = ({ data: pcm }) => {
          if (!this.needRecord) return;
          this.onprogress?.(pcm);
        };
        this.recorderNode = audioNode;
      });
    } else {
      const createScript = this.context?.createScriptProcessor;
      const { channels } = this.config;
      this.recorder = createScript?.apply(this.context, [4096, channels, channels]);
      // 音频采集
      this.recorder.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.needRecord) return;
        // 左声道数据
        const lData = e.inputBuffer.getChannelData(0);
        // 右声道数据
        const rData = channels === 2 ? e.inputBuffer.getChannelData(1) : new Float32Array();
        const pcm = this.transformIntoPCM(lData, rData);
        // 回调当前录音pcm数据
        this.onprogress?.(pcm);
      };
    }
  }

  /**
   * 终止流（这可以让浏览器上正在录音的标志消失掉）
   */
  private stopStream() {
    const { stream } = this;
    if (stream?.getTracks) {
      stream.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
    }
  }

  /**
   * close兼容方案
   * 如firefox 30 等低版本浏览器没有 close方法
   */
  private closeAudioContext() {
    const { context } = this;
    if (context?.close && context?.state !== 'closed') return context.close();
    return Promise.resolve();
  }

  /**
   * 将获取到到左右声道的Float32Array数据编码转化
   * @param {Float32Array} lData  左声道数据
   * @param {Float32Array} rData  有声道数据
   * @returns DataView
   */
  private transformIntoPCM(lData: Float32Array, rData: Float32Array) {
    return transformIntoPCM(
      lData,
      rData,
      this.inputSampleRate,
      this.outputSampleRate,
      this.outputSampleBits,
      this.littleEndian,
    );
  }
}
