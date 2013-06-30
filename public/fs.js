
  // - you have to create a filesys obj with some storage, create a temp file, then see if the quote is exceeded
  // - there are two different types of storage and the requestQuote method takes 3 arguments
  // - requestQuote(byteMultiplier, successHandler, errorHandler);
  /*
   * - only way to check for file existence is to create a new file with the same name and see if it throws an error
   * - no way to list all files?
   * - file refs can create writers and readers which have a variety of events to hook into and write 
   * blobs.
  */
  
	// 
	// (function() {
	// 	var FileSystem = function() {
	// 		// Constants
	// 		

	// 	};
	// 	
	// 	return FileSystem
	// }).call(this);
	
	
	var FileSystem = function() {
		var P = PERSISTENT;
		var T = TEMPORARY;
		var MB = 1024 * 1024;
		
		this.bytes = ((opts && opts.storage) || 2000) * MB;
		this.file = null;
		this.allocate();
		
		return this.fs
	}
	
	FileSystem.prototype.allocate = function() {
		webkitRequestFileSystem(p, this.bytes, this.onFsInit, this.onError);
	};
	
	FileSystem.prototype.onFsInit = function() {
		console.log("File system sandbox accessed.");
    this.fs = fileSys;
    console.log(fs)
    console.log('quota info');
    console.log(persistentStorage.queryUsageAndQuota(function(used,allocated) {console.log(used)}));
	};
	
	FileSystem.prototype.findOrCreateFile = function(filename) {
		var file;
		
		fs.root.getFile(filename, {create: true, exclusive: true}, function(fileEntry) {
	    console.log('File created');
			this.file = fileEntry
	  }, function(e) {
	    if(e.code === 9) {
	      console.log('file exists, opening..')
	      fs.root.getFile(filename, {}, function(entry) {
	        this.file = entry;
	      },onError);
	    }
	  });
	};
	
	FileSystem.prototype.writeFile = function(type, content) {
		if(!this.file) throw new Error("No file to write to");
		
    this.file.createWriter(function(writer) {
      writer.onwriteend = function() {
        console.log('File written');
      }; 

      writer.onerror = function(e) {
        console.log("Write failed: " + e.toString());
      };
			
			if(type.toLowerCase() === "a") writer.seek(writer.length)
      writer.write(content);
    }, onError);
  };
	
	
	
	
	var tempStorage = navigator.webkitTemporaryStorage,
   		persistentStorage = navigator.webkitPersistentStorage,
  		fs = null,
  		filePointer = null,
			storage = 2000 * 1024 * 1024; //two gigs
			
			
	function allocateStorage(grantedBytes) {
		console.log(grantedBytes /(1024*1024)  + " megabytes have been made available to the application.");
		window.webkitRequestFileSystem(window.PERSISTENT, grantedBytes, onFsInit, onError);
	}
	
  persistentStorage.requestQuota(storage, allocateStorage, onError);

  function onFsInit(fileSys) {
    console.log("File system sandbox accessed.");
    fs = fileSys;
    console.log(fs)
    console.log('quota info');
    console.log(persistentStorage.queryUsageAndQuota(function(used,allocated) {console.log(used)}));
    findOrCreateFile('test.wave');
  }

  function onError(e) {
    var msg = '';

    switch (e.code) {
      case FileError.QUOTA_EXCEEDED_ERR:
        msg = 'QUOTA_EXCEEDED_ERR';
        break;
      case FileError.NOT_FOUND_ERR:
        msg = 'NOT_FOUND_ERR';
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
    };

    console.log('Error: ' + msg);
  }
  


  //create a file.  must be derived from a specific folder, in this case the root;
  function findOrCreateFile(filename) {
	  fs.root.getFile(filename, {create: true, exclusive: true}, function(fileEntry) {
	    console.log('File created');
	  }, function(e) {
	    if(e.code === 9) {
	      console.log('file exists, opening..')
	      fs.root.getFile(filename, {}, function(entry) {
	        filePointer = entry;
	        writeFile(filePointer);
	      },onError);
	    }
	  });
  }
  
  function mkDir(root, folders) {
    if(folders[0] === "." || folders[0] === "") folders = folders.slice(0);

    root.getDirectory(folders[0], {create: true}, function(dirEntry) {
     if(folders.length !== 0) mkDir(fs.root, folders.slice(1));
    }, onError);
  }
   
  function writeFile(fPntr) {
    // Appending works in the same way, except we call writer.seek(writer.length) first to move to
    // writer to the end of the file.  I suppose this means we could insert into arbitrary 
    // places too?

    fPntr.createWriter(function(writer) {
      writer.onwriteend = function() {
        console.log('File written');
        console.log(fPntr.toURL());
        readFile(fPntr);
      }; 

      writer.onerror = function(e) {
        console.log("Write failed: " + e.toString());
      };
      
      var content = new Blob(["Hi, I'm some text in a fake file"],{type: "text/plain"});

      writer.write(content);
    }, onError);
  }

  function readFile(fPntr) {
    var reader = new FileReader();
    
    // We have to create a file obj from the pointer to read its contents
    fPntr.file(function(file) {
      reader.onloadend = function(e){
        console.log("File successfully read.");
        console.log(e.currentTarget.result);
      };

      reader.readAsText(file);
    }, onError);
  }
  
  function readDir(fs) {
    var dirReader = fs.root.createReader();
    var entries = [];
    
    var read = function(entries) {
      dirReader.readEntries(function(results) {
        if(results.length === 0) {
          return listFiles(entries);
        } else {
          read(entries.concat([].slice.call(results, 0)));
        }
      }, onError);
    };
    read(entries);
  }
  
  function listFiles(list) {
    var files = document.querySelector("#filelist");
    list.forEach(function(file) {
      var li = document.createElement("li");
      var type = !file.isFile ? "<span class='badge'>Folder </span>" : "<span class='badge'>File </span>";

      li.innerHTML = [type, "<span>", file.name, "</span"].join("");
      files.appendChild(li);
    });
  }


  document.querySelector("#make-dir").onclick = function(e) {
    e.preventDefault();
    mkDir(fs.root, document.querySelector("#dirnames").value.split('/'));
  };
