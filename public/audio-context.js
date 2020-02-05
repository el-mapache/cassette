(function(root) {
  var br = root.BrowserRecorder = root.BrowserRecorder || {};
  var context;

  br.getAudioContext = function() {
    if (context) {
      return context;
    }

    try {
      context = new root.AudioContext();
    } catch(e) {
      console.log('Unfortunately, this app only supports Google Chrome.')
    }

    return context;
  }
})(window);
