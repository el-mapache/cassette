var recLength = 0,
    recBuffersL = [],
    recBuffersR = [],
    sampleRate,
    numChannels;

this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'drain':
      drain();
      break;
    case 'writeHeaders':
      writeHeaders();
      break;
    case 'exportWAV':
      exportWAV(e.data.type);
      break;
    case 'clear':
      clear();
      break;
    case 'getBuffer':
      getBuffer();
      break;
  }
};

function init(config) {
  sampleRate = config.sampleRate;
  numChannels = config.numChannels;
}


function record(inputBuffer){ 
  recBuffersL.push(inputBuffer[0]);

  if(numChannels === 2) recBuffersR.push(inputBuffer[1]);

  recLength += inputBuffer[0].length;
}

// Remove all samples form the buffer and convert data to 16bit int.
// Naive and not threadsafe
function drain() {
  var samples = mergeBuffers(recBuffersL.splice(0,recBuffersL.length), recLength),
      buffSize = samples.length * 2,
      view = new DataView(new ArrayBuffer(buffSize));

  recLength = 0;
  floatTo16BitPCM(view, 0, samples);
  this.postMessage({
    payload: {
      blob: new Blob([view]),
      size: buffSize
    },
    type: "object"
  });
}

function exportWAV(type) {
  var bufferL = mergeBuffers(recBuffersL, recLength),
      dataview,
      interleaved = null;

  if(numChannels === 2) {
    var bufferR = mergeBuffers(recBuffersR, recLength),
    interleaved = interleave(bufferL, bufferR);
 }
 
 clear();
 dataview = encodeWAV(interleaved ? interleaved : bufferL),
 this.postMessage({
   payload:  new Blob([dataview], { type: type }),
   type: "object"
 });
}

function getBuffer() {
  var buffers = [];
  buffers.push(mergeBuffers(recBuffersL, recLength));

 if(numChannels === 2)
   buffers.push( mergeBuffers(recBuffersR, recLength) );

  this.postMessage({payload: buffers, type: "object"});
}

function clear(){
  recLength = 0;
  recBuffersL = [];
  recBuffersR = [];
}

// Reads from a standard array of float32 arrays
function mergeBuffers(recBuffers, recLength) {
  var result = new Float32Array(recLength),
   offset = 0,
   i = 0,
   length = recBuffers.length;

  for(i; i < length; ++i){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }
  return result;
}


// Two discreet inputs become a single stereo track
function interleave(inputL, inputR){
  var length = inputL.length + inputR.length,
    result = new Float32Array(length),
   index = 0,
     inputIndex = 0;

  while (index < length){
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

//WORKING VERSION OF THIS FUNCTION
function floatTo16BitPCM(output, offset, input){
  var i = 0,
      length = input.length;
   
  for (i; i < length; ++i, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
 var i = 0,
   length = string.length;
   
  for (i; i < length; ++i){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples){
  var length = samples.length,
      view = new DataView(new ArrayBuffer(44 + samples.length * 2));//new ArrayBuffer(44 + length * 2));

  /* ChunkID
  * The string "RIFF" as ASCII
  * This should be big endian
  * unsigned char, one byte per character
  */
  writeString(view, 0, 'RIFF');
  
 /* ChunkSize 
  * This represents the size of the entire file, not
  * counting the 8 bytes used in the CHUNKID and ChunkSize field
  * Formula is 4 + (8 + SubChunk1) + (8 + SubChunk2)
  * In the case of PCM, subChunk1 is 16 bytes
  * Unsigned Int, 4 bytes
 */
  view.setUint32(4, 36 + length * 2, true);

  /* Format 
  * The string "WAVE" as ASCII
  * should be Big endian
  * Unsigned Char, 1 byte per character
 */
  writeString(view, 8, 'WAVE');

  /* Subchunk Block 
   * SubchunkID, ASCII encoded string "fmt"
   * Unsigned Char, 1 byte per character
  */
  writeString(view, 12, 'fmt ');
  
 /* Subchunk1 Size 
  * This represents the number of bytes in the remainer of the 
  * fmt subchunck.
  * The 16 indicates PCM data
  * Unsigned Int, 4 bytes
 */
  view.setUint32(16, 16, true);

  /* AudioFormat 
   * 1 indicates Linear Quantization, or PCM
  * Unsigned Short, occupies two bytes
 */
  view.setUint16(20, 1, true);

  /* NumChannels
  * The number of audio channels
  * 1 = Mono, 2 = stereo, etc
  * Unsigned Short, 2 bytes
  */
  view.setUint16(22, 1, true); 

  /* SampleRate 
  * Unsigned Int, 4 bytes
 */
  view.setUint32(24, sampleRate, true);

  /* ByteRate 
  * SampleRate * NumChannels * (BitsPerSample/8)
  * This can also be understood as SampleRate * BlockAlign
  * Unsigned Int, 4 bytes
 */
  view.setUint32(28, sampleRate * 2, true);

  /* BlockAlign 
  * (NumberChannels * (BitsPerSample/8))
  * 2 channels of audio at 16bps would have a BlockAlign of 4.
  * A mono audio track at 16bps would have a BlockAlign of 2
  * Unsigned Short, 2 bytes
 */
  view.setUint16(32, 2, true); 

  /* BitsPerSample 
   * Unsigned Short, 2 bytes
 */
  view.setUint16(34, 16, true);

  /* SubChunk2ID 
   * The letters "data" in ASCII format 
   * Unsigned char, 1 byte per character
  */
  writeString(view, 36, 'data');

  /* SubChunk2Size 
   * NumSamples * NumChannels * BitPerSample/8
   * This can also be understood as NumSamples * BlockAlign
   * Unsigned Int, 4 bytes
  */
  view.setUint32(40, length * 2, true);

  floatTo16BitPCM(view, 44, samples);
  return view;
}

// Set temporary headers to be overwritten when the file is complete
function writeHeaders() {
  var length = 10,
      view = new DataView(new ArrayBuffer(44 + length * 2));

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length * 2, true);
  this.postMessage({payload: view, type: "object"});
}

// this.pipe = function() {
//  var c = recLength;
//  var end = recBuffersL.end;
//  if(end < recBuffersL.start) {
//   var move = ((recBuffersL.length - 1) - recBuffersL.start) + end; 
//  } else {
//   var move = end - recBuffersL.start;
//  }
//  view = new Uint16Array(44 + c * 2);
//  var i = 0;
//  var j = 0;
//  var offset = 44;
// 
//  for(i;i < move; i++) {
//   var that = recBuffersL.read();
//   for(j; j<256;j++,offset+=2) {
//    var s = Math.max(-1, Math.min(1, that[j]));
//    view[offset] = s < 0 ? s * 0x8000 : s * 0x7FFF;
//   }
//  }
// };

/* THIS VERSION CALLED FROM CIRCULAR BUFFER OUTPUT */
// function floatTo16BitPCM(output, offset, input){
//  var i = 0,
//    length = input.length;
//    
//   for (i; i < length; i++, offset+=2){
//     var s = Math.max(-1, Math.min(1, input[i]));
//     output[offset] =  s < 0 ? s * 0x8000 : s * 0x7FFF;
//   }
// };
 // if(itr !== 1) {
 //  view = copy();
 //   offset = view.length;
 // } else {
 //   view = new Uint16Array(44 + recLength * 2);
 //   offset = 44;
 // }
 //   //position to set each array of floats
 //   var offset = snapshotTime;
 //   // current length of samples we need to allocate for our buffer
 //   snapshotTime = recLength - snapshotTime;
 //   // allocated buffer
 //   var buffer = new Float32Array(snapshotTime);
 //   //
 //   while(offset < snapshotTime) {
 //     var toSet = recBuffersL.read();
 //   //  console.log(this.cb.start)
 //   //  console.log(offset)
 //     buffer.set(toSet,offset);
 //     offset += toSet.length
 //   }

  //empty the temp buffer
//  buffer = null;
//};

// function copy(buffer) {
//   // make a new array buffer of 2 seconds times the number of buffers created
//   var u16 = new Uint16Array(44 + total);
//   var offset = 44;
//   var oldLen = view.length;
//   this.postMessage(oldLen);
//   // copy the relevent PCM data
//   for(var i = 0; i < oldLen;i++,offset += 2) {
//     u16[offset] = view[i];
//   } 
// 
//   return u16;  
// }
