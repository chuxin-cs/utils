import type { AudioData } from './type';
/**
* 在data中的offset位置开始写入str字符串
* @param {DataView} data    二进制数据
* @param {Number}   offset  偏移量
* @param {String}   str     字符串
*/
function writeString(data: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i += 1) data.setUint8(offset + i, str.charCodeAt(i));
}

/**
* 数据合并压缩
* 根据输入和输出的采样率压缩数据，
* 比如输入的采样率是48k的，我们需要的是（输出）的是16k的，由于48k与16k是3倍关系，
* 所以输入数据中每隔3取1位
* @param {AudioData} data       [-1, 1]的pcm数据
* @param {number} inputSampleRate  输入采样率
* @param {number} outputSampleRate 输出采样率
* @returns  {Float32Array}         压缩处理后的二进制数据
*/
export function compress(
  data: AudioData,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  // 压缩，根据采样率进行压缩
  const rate = inputSampleRate / outputSampleRate;
  const compression = Math.max(rate, 1);
  const lData = data.left;
  const rData = data.right;
  const length = Math.floor((lData.length + rData.length) / rate);
  const result = new Float32Array(length);
  let index = 0;
  let j = 0;
  // 循环间隔 compression 位取一位数据
  while (index < length) {
    // 取整是因为存在比例compression不是整数的情况
    const temp = Math.floor(j);
    result[index] = lData[temp];
    index += 1;
    if (rData.length) {
      /*
      * 双声道处理
      * e.inputBuffer.getChannelData(0)得到了左声道4096个样本数据，1是右声道的数据，
      * 此处需要组和成LRLRLR这种格式，才能正常播放，所以要处理下
      */
      result[index] = rData[temp];
      index += 1;
    }
    j += compression;
  }
  // 返回压缩后的一维数据
  return result;
}

/**
* 转换到我们需要的对应格式的编码
* @param {Float32Array} bytes      pcm二进制数据
* @param {number}  sampleBits      采样位数
* @param {boolean} littleEndian     是否是小端字节序
* @returns {DataView}              pcm二进制数据
*/
export function encodePCM(bytes: Float32Array, sampleBits: number, littleEndian = true): DataView {
  let offset = 0;
  const dataLength = bytes.length * (sampleBits / 8);
  const buffer = new ArrayBuffer(dataLength);
  const data = new DataView(buffer);
  // 写入采样数据
  if (sampleBits === 8) {
    for (let i = 0; i < bytes.length; i += 1, offset += 1) {
      // 范围[-1, 1]
      const s = Math.max(-1, Math.min(1, bytes[i]));
      // 8位采样位划分成2^8=256份，它的范围是0-255;
      // 对于8位的话，负数*128，正数*127，然后整体向上平移128(+128)，即可得到[0,255]范围的数据。
      let val = s < 0 ? s * 128 : s * 127;
      val = +val + 128;
      data.setInt8(offset, val);
    }
  } else {
    for (let i = 0; i < bytes.length; i += 1, offset += 2) {
      const s = Math.max(-1, Math.min(1, bytes[i]));
      // 16位的划分的是2^16=65536份，范围是-32768到32767
      // 因为我们收集的数据范围在[-1,1]，那么你想转换成16位的话，只需要对负数*32768,对正数*32767,即可得到范围在[-32768,32767]的数据。
      data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, littleEndian);
    }
  }
  return data;
}

/**
* 编码wav，一般wav格式是在pcm文件前增加44个字节的文件头，
* 所以，此处只需要在pcm数据前增加下就行了。
*
* @param {DataView} bytes           pcm二进制数据
* @param {number}  inputSampleRate  输入采样率
* @param {number}  outputSampleRate 输出采样率
* @param {number}  channels      声道数
* @param {number}  outputSampleBits  输出采样位数
* @param {boolean} littleEndian      是否是小端字节序
* @returns {DataView}               wav二进制数据
*/
export function encodeWAV(
  bytes: DataView,
  inputSampleRate: number,
  outputSampleRate: number,
  channels: number,
  outputSampleBits: number,
  littleEndian = true,
): DataView {
  // 输出采样率较大时，仍使用输入的值
  const sampleRate = Math.min(outputSampleRate, inputSampleRate);
  const sampleBits = outputSampleBits;
  const buffer = new ArrayBuffer(44 + bytes.byteLength);
  const data = new DataView(buffer);
  const channelCount = channels; // 声道
  let offset = 0;
  // 资源交换文件标识符
  writeString(data, offset, 'RIFF'); offset += 4;
  // 下个地址开始到文件尾总字节数,即文件大小-8
  data.setUint32(offset, 36 + bytes.byteLength, littleEndian); offset += 4;
  // WAV文件标志
  writeString(data, offset, 'WAVE'); offset += 4;
  // 波形格式标志
  writeString(data, offset, 'fmt '); offset += 4;
  // 过滤字节,一般为 0x10 = 16
  data.setUint32(offset, 16, littleEndian); offset += 4;
  // 格式类别 (PCM形式采样数据)
  data.setUint16(offset, 1, littleEndian); offset += 2;
  // 声道数
  data.setUint16(offset, channelCount, littleEndian); offset += 2;
  // 采样率,每秒样本数,表示每个通道的播放速度
  data.setUint32(offset, sampleRate, littleEndian); offset += 4;
  // 波形数据传输率 (每秒平均字节数) 声道数 × 采样频率 × 采样位数 / 8
  data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), littleEndian); offset += 4;
  // 快数据调整数 采样一次占用字节数 声道数 × 采样位数 / 8
  data.setUint16(offset, channelCount * (sampleBits / 8), littleEndian); offset += 2;
  // 采样位数
  data.setUint16(offset, sampleBits, littleEndian); offset += 2;
  // 数据标识符
  writeString(data, offset, 'data'); offset += 4;
  // 采样数据总数,即数据总大小-44
  data.setUint32(offset, bytes.byteLength, littleEndian); offset += 4;
  // 给wav头增加pcm体
  for (let i = 0; i < bytes.byteLength;) {
    data.setUint8(offset, bytes.getUint8(i));
    offset += 1;
    i += 1;
  }
  return data;
}

/**
 * 将获取到到左右声道的Float32Array数据编码转化
 * @param {Float32Array} lData  左声道数据
 * @param {Float32Array} rData  有声道数据
 * @param {number}  inputSampleRate  输入采样率
 * @param {number}  outputSampleRate 输出采样率
 * @param {number}  outputSampleBits  输出采样位数
 * @param {boolean} littleEndian      是否是小端字节序
 * @returns DataView
 */
export function transformIntoPCM(
  lData: Float32Array,
  rData: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
  outputSampleBits: number,
  littleEndian = true,
  compressPCM = compress,
  encode = encodePCM,
) {
  const lBuffer = new Float32Array(lData);
  const rBuffer = new Float32Array(rData);
  const data = compressPCM({ left: lBuffer, right: rBuffer }, inputSampleRate, outputSampleRate);
  return encode(data, outputSampleBits, littleEndian);
}
