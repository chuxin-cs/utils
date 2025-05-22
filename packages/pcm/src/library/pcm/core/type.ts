export interface AudioData {
  left: Float32Array,
  right: Float32Array
}
export type InputCodec = 'Int16' | 'Int8'
export type SampleBits = 16 | 8
export type Channels = 1 | 2
export type SampleRate = 8000 | 11025 | 16000 | 22050 | 24000 | 44100 | 48000
export interface PlayerConfig {
  inputCodec?: InputCodec,
  channels?: Channels,
  sampleRate?: SampleRate
  flushTime?: number
}
export interface RecorderConfig {
  sampleBits?: SampleBits,
  sampleRate?: SampleRate,
  channels?: Channels
}
