/* copyright (c) Adam Biagianti/el-mapache 2013.
 * Heavily based on HTML5 rocks filesystem article http://www.html5rocks.com/en/tutorials/file/filesystem/
 * MIT License
 * Thanks dudez
 */
(function(root) {
  // Test if the API is accessible before we set anything else up
  // Not 100% certain how to handle these errors yet
  if (root.location.protocol === "file:") 
     throw new Error("The Filesystem API can only be accessed via http.");
  if (!root.webkitRequestFileSystem)
    throw new Error("Sorry, the Filesystem API is currently only available on Google Chrome.");

  var P = PERSISTENT;
  var T = TEMPORARY;
  var MB = 1024 * 1024;
  
  // Limited error reporting
  function onError(e) {
    var msg = '';

    switch (e.code) {
      case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'File system full.';
        break;
      case FileError.NOT_FOUND_ERR:
        msg = 'The requested file cant\'t be located.';
        break;
      case FileError.SECURITY_ERR:
        msg = 'SECURITY_ERR';
        break;
      case FileError.INVALID_MODIFICATION_ERR:
        msg = 'INVALID_MODIFICATION_ERR';
        break;
      case FileError.INVALID_STATE_ERR:
        msg = 'INVALID_STATE_ERR';
        break;
      default:
        msg = 'Unknown Error';
        break;
    }
    console.log(msg);
  }

  function toArray(list) {
    return Array.prototype.slice.call(list || [], 0);
  }

  function isCallback(fn) {
    return typeof fn === "function" ? fn : false;
  };

  root.FileSystem = root.FileSystem || function() {};

  root.FileSystem = FileSystem = function(opts) {
    Constructor: FileSystem;

    this.debug = opts && opts.debug || false; 
    this.fs = null;
    this.file = null;
    this.bytes = ((opts && opts.storage) || 4000) * MB;
    this.type = window[opts && opts.type || 'PERSISTENT'];
    this.cb = opts && opts.callback || null;
    this.allocateStorage();
  }

  // Noop after the initial allocation request,
  // unless additional storage space is being requested
  FileSystem.prototype.allocateStorage = function() {
    var self = this;
    webkitStorageInfo.requestQuota(this.type, this.bytes, function(bytes) {
      webkitRequestFileSystem(self.type, bytes, self.onFsInit.bind(self, arguments), onError);
    },onError);
  };
  
  FileSystem.prototype.getStorageType = function() {
    if (this.type === PERSISTENT)
      return window.navigator.webkitPersistentStorage;
    
    if (this.type === TEMPORARY)
      return window.navigator.webkitTemporaryStorage;
  };

  FileSystem.prototype.onFsInit = function(args, fileSys) {
    this.getStorageType();
    this.fs = fileSys.root;
    this.cb && this.cb();

    if (this.debug) {
      console.log("File system sandbox accessed.");
      this.availableStorage();
    }
  };

  FileSystem.prototype.availableStorage = function() {
    function currentAndTotalStorage(used, allocated) {
      console.log(used / MB + " MB used.");
      console.log(allocated / MB + " MB total space remaining.");
    }

    this.getStorageType().queryUsageAndQuota(currentAndTotalStorage);
  };

 FileSystem.prototype.removeFile = function(filename, cb) { 
   var cb = isCallback(cb);

   this.fs.getFile(filename, {create: false}, function(fileEntry) {
     if (this.file === fileEntry) this.file = null;
     fileEntry.remove(function() {
       cb && cb();
     }, onError);
   }, onError);
 };
  
 // Reads a portion of a file into memory.  Useful for overwriting small amounts 
 // of data, like the headers on a wav file
 // {@param from} Number first byte to be read
 // {@param to} Number last byte to be read
 // {@param cb} Function callback with the results of the write
 FileSystem.prototype.readChunk = function(from, to, cb) {
   var cb = isCallback(cb); 

   if(arguments.length < 3) throw new Error("Invalid arguments.");

   this.file.file(function(file) {
     var reader = new FileReader();
     reader.onload = function(e) {
        cb && cb(e.target.result);
     };

     reader.readAsArrayBuffer(file.slice(from, to));
   });
 } 

 FileSystem.prototype.getFile = function(filename, cb) {
   var cb = isCallback(cb),
       self = this;

   this.fs.getFile(filename, {}, function(fileEntry) {
     self.file = fileEntry;
     cb && cb(fileEntry);
   }, onError);
 };

 FileSystem.prototype.findOrCreateFile = function(filename, cb) {
   var self = this,
       fs = this.fs;

   cb = isCallback(cb);

   function onFileRetrieval(fileEntry) {
     if (self.debug) console.log('File created');
     self.file = fileEntry;
     cb && cb(self.file);
   }

   function onRetrievalError(err) {
     if (err.code === 9) {
       if (self.debug) console.log('file exists, opening..')
       fs.getFile(filename, {}, function(entry) {
         self.file = entry;
         return cb && cb(self.file);
       },onError);
     } else {
       return onError(err);
     }
   }

   fs.getFile(filename, {
     create: true, 
     exclusive: true
   }, onFileRetrieval, onRetrievalError);
 };

 FileSystem.prototype.getResourceURL = function(file) {
   return this.file.toURL();
 };

 FileSystem.prototype.writeFile = function(content, type, cb, position) {
   if(!this.file) throw new Error("No file to write to.");
   if(!content instanceof Blob) throw new Error("Content must be an instance of Blob.");
    
   var cb = isCallback(cb);

   this.file.createWriter(function(writer) {
     writer.onwriteend = function() {
       console.log('File written');
     }; 

     writer.onerror = function(e) {
       console.log("Write failed!\n");
       console.log(e);
     };

     if(type.toLowerCase() === "a") {
       writer.seek(typeof position !== "undefined" || writer.length);
     }

     writer.write(content);

     cb && cb();
   }, onError);
 };

 // Recursively makes nested directories after parent dir is created
 // {@param rootDir} String initial parent directory
 // {@param folders} String names of folders separated by a '/' 
 // {@param cb} Function callback executed after all folders are created
 FileSystem.prototype.mkDir = function(rootDir, folders, cb) {
   var folders = folders.split('/'),
       cb = isCallback(cb);

   // Remove hidden folders and call again
   function createDir(root, folder) {
     if((folders[0] === '.' || folders[0] === '') && folders.length !== 0) {
       createDir(dirEntry, folders.splice(0,1));
     }

     root.getDirectory(folder, {create: true}, function(dirEntry) {
       if(folders.length === 0) return cb && cb();
       createDir(dirEntry, folders.splice(0,1));
     }, onError);
   }

   createDir(rootDir, folders.splice(0,1));
 };
  
 // Read the entire filesystem recursively in parallel.
 // TODO explore do this in series and then sorting?
 FileSystem.prototype.readDir = function(root, cb) {
  function walk(root,done) {
    var results = [];
    var temp = [];
    var reader = root.createReader();
    var name = root.fullPath;
    
    function read() {
      reader.readEntries(function(list) {
        if (!list.length) {
          var i = 0;

          (function next() {
            var file = temp[i++];
            if (!file) return done(results);
            // Add file to the filesystem array
            results.push(name + '/' + file.name);
            if(file.isDirectory) {
              walk(file, function(res) {
                results = results.concat(toArray(res));
                next();
              });
            } else {
              next();
            }
          })();
        } else {
          // We don't know if all entries have been returned so put 
          // the current results into a temporary array and relist the files.
          temp = temp.concat(toArray(list));
          read();
        }
      }, onError);
    }
    read();
  }

  walk(root,cb); 
 };

 FileSystem.prototype._listEntries = function(list) {
  var files = document.querySelector("#filelist"),
       level = 0;
  var self = this;
  list.forEach(function(file) {
    var li = document.createElement("li"),
        type = !file.isFile ? "<span class='badge'>Folder </span>" : "<span class='badge'>File </span>";

    li.innerHTML = [type, "<span>", file.name, "</span"].join("");
    if(!file.isFile) {
      li.style.marginLeft = (5 * level) + "px";
      ++level;

      var parentDir = self.fullPath.replace(root.name,"");
      self.fileTree['/']
      self.readDir(file);
    }
    li.onclick = function() {
     self.findOrCreateFile("test.tmp");
    };
    files.appendChild(li);
  }); 
};

 return FileSystem;
})(window);
