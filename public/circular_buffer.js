(function(window) {
  // Leaves a single unallocated slot for differentiating between the start
  // and end points when the buffer is empty or full
  var root = window,
      SC = root.SC = root.SC || {};

  SC.CircularBuffer = function(size) {
    this.maxSize = size + 1;
    this.buff = [];
    this.start = 0;
    this.end = 0;
  };

  SC.CircularBuffer.constructor = SC.CircularBuffer;
  
  SC.CircularBuffer.prototype = {
    clear: function() {
      this.start = 0;
      this.end = 0;
      return this.buff = [];
    },

    isEmpty: function() {
      return this.buff.length === 0;
    },

    isFull: function() {
      return ((this.end + 1) % this.maxSize) === this.start;
    },
    
    write: function(data) {
      // Pass the current contents of the buffer to the callback function
     /* if((this.start - 1) === (this.maxSize - 2) && this.callback) {
        this.callback(this.buff);
      }*/

      this.buff[this.end] = data; 
      this.end = (this.end + 1) % this.maxSize;
      if(this.start === this.end) {
        this.start = (this.start + 1) % this.maxSize;
      }
    },
    
    // Read the oldest index
    read: function() {
      if(!this.isEmpty()) {
        var current = this.buff[this.start];
        this.start = (this.start + 1) % this.maxSize;
      }
      return current;
    },
    
    length: function() {
      return this.buff.length;
    },

    last: function() {
      if(this.isEmpty()) {
        return  null;
      }

      return this.end - 1;
    }
  };
  
  return SC.CircularBuffer;
}(window));
