/* Adapted from Matt Diamond recorder.js
 * changes by adam biagianti/el-mapache 2013
**/
(function(window) {

  var WORKER_PATH = 'recorderWorker.js';
 //looks like 5 mb per minute
 var Recorder = function(source, options){
   var config = options || {},
   bufferLen = config.bufferLen || 256,
   worker = new Worker(config.workerPath || WORKER_PATH),
   numChannels = config.channels || 1,
   recording = false,
   currCallback = function() {},
   recTimeInSeconds = 0,
   recordTimer,
   self = this;

   // the context holds methods that affect audio data
   this.context = source.context;
   this.source = source;

   this.overallRecTime = 0;
   this.snapshotTime = 0;

   //create with buffer length, and input and output channels
   this.node = this.context.createJavaScriptNode(bufferLen, 1, 1);
   this.volume = this.context.createGainNode();

   //connect our source to the buffer, then to the output
   this.source.connect(this.node);
   this.node.connect(this.context.destination);    

    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate,
        numChannels: numChannels,
        bufferLength: bufferLen
      }
    });
  
    this.node.onaudioprocess = function(e){
      if(!recording) return;
   // if(numChannels === 2) 
   //  buffer = [e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1)];
   // else
      var buffer = [e.inputBuffer.getChannelData(0)];
    
      worker.postMessage({
        command: 'record',
        buffer: buffer
      });
    }
   
  this.drain = function(cb) {
    currCallback = cb;
    worker.postMessage({command: 'drain'});
    worker.onmessage = function(e){
      var payload = e.data.payload;
      console.log('message called');
      console.log('data being passed back below!!!');

      if(e.data.type === "object") {
        currCallback(payload);
      } else {
        console.log(payload);
      }
    }
  };  

  this.patch = function(snd, device, rtrn) {
   snd.connect(device);
      device.connect(rtrn);
  }
  
  this.configure = function(cfg) {
    for (var prop in cfg){
      if (cfg.hasOwnProperty(prop)){
        config[prop] = cfg[prop];
      }
    }
  }

  this.record = function(){
    recording = true;
    recordTimer = setInterval(function() {
      console.log('Current time is ' + recTimeInSeconds + ' in seconds');
      recTimeInSeconds++;
    },1000)
  }
  
  this.gain = function(e) {
   this.volume.gain.value = Number(e.currentTarget.value);
      this.patch(this.source,this.volume,this.node);
  }
  
  this.pause = function() {
    recording = recording ? false : true;

    if(this.source.muted) {
      this.source.unmute
    } else {
      this.source.muted
    }
  }
  
  this.stop = function(){
    recording = false;
    clearInterval(recordTimer);
    delete this.source;
    delete this.node;
  }

  this.clear = function() {
    worker.postMessage({ command: 'clear' });
  }
    
  this.writeHeaders = function(cb) {
    currCallback = cb;
    worker.postMessage({command: "writeHeaders"}); 
  };

  this.getBuffer = function(cb) {
    currCallback = cb || config.callback;
    worker.postMessage({ command: 'getBuffer' })
  }
  
    this.exportWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      
   if (!currCallback) {
    throw new Error('Callback not set');
   }
   console.log('about to write audio headers');
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    }

    worker.onmessage = function(e){
      var payload = e.data.payload;
      console.log('message called');
      console.log('data being passed back below!!!');
      if(e.data.type === "object")
        currCallback(payload);
      else
        console.log(payload);
    }
  };

  Recorder.forceDownload = function(blob, filename) {
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.getElementById("download") || document.createElement('a');

    link.href = url;
    link.download = filename || 'output.wav';
    link.id = "download";
    link.innerHTML = "click here to download";
    document.querySelector('body').appendChild(link)
    // var click = document.createEvent("Event");
    //    click.initEvent("click", true, true);
    //    link.dispatchEvent(click);
  }

  window.Recorder = Recorder;
})(window);
