/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/ban-types */
import { transformIntoPCM, compress, encodePCM } from './transform';

let crrUrl: string;
export default (
  inputSampleRate: number,
  outputSampleRate: number,
  outputSampleBits: number,
  channels: 1 | 2,
  littleEndian = true,
) => {
  function execute(
    n: string,
    isr: number,
    osr: number,
    osb: number,
    c: 1 | 2,
    le: boolean,
    $compress: Function,
    $encodePCM: Function,
    createProcessor: Function,
  ) {
    // @ts-ignore
    const transform2PCM = $transformIntoPCM;
    const encode = {
      1: (left: Float32Array) => transform2PCM(
        left,
        new Float32Array(0),
        isr,
        osr,
        osb,
        le,
        $compress,
        $encodePCM,
      ),
      2: (left: Float32Array, right: Float32Array) => transform2PCM(
        left,
        right,
        isr,
        osr,
        osb,
        le,
        $compress,
        $encodePCM,
      ),
    }[c];
    registerProcessor(n, createProcessor(encode));
  }
  const name = 'recorder-processor';
  const blob = new Blob(
    [
      `
        const $encodePCM = ${encodePCM.toString()};
        const $compress = ${compress.toString()};
        const $transformIntoPCM = ${transformIntoPCM.toString()};
        const $createProcessor = (encode) => {
          class WhiteNoiseProcessor extends AudioWorkletProcessor {
            process(inputs) {
              const [[left, right]] = inputs;
              const pcm = encode(left, right);
              this.port.postMessage(pcm);
              return true;
            }
          }
          return WhiteNoiseProcessor;
        };
        (${execute.toString()})('${name}',${inputSampleRate},${outputSampleRate},${outputSampleBits},${channels},${littleEndian},$compress,$encodePCM,$createProcessor);`,
    ],
    { type: 'text/javascript' },
  );
  if (crrUrl) URL.revokeObjectURL(crrUrl);
  crrUrl = URL.createObjectURL(blob);
  return {
    url: crrUrl,
    name,
  };
};
