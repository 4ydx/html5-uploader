/*
 * jQuery HTML5 uploading plugin 1.0.0
 * https://github.com/4ydx/html5-uploader
 *
 * Copyright 2011, Nathan Findley 
 * http://4ydx.com
 *
 * Licensed under the GNU General Public License, version 2:
 * http://opensource.org/licenses/GPL-2.0
 */
(function($) {
  'use strict';
  /*
   * The jQuery upload plugin give you a simple interface for uploading files.
   * All files are queued and uploaded using html5 technology.
   *
   * 1) Apply this plugin on an existing input file element.
   * 2) Make sure your server's response is JSON encoded with a 'status' element.
   * 3) Enjoy your new html5 upload abilities!
   */
  $.fn.uploader = function(params) {
    var error = {
      /* server or xhr error */
      'type'  : '',
      /* xhr requests status on error */
      'status': 0,
      /* server json response or xhr object */
      'data'  : {}
    };
    var settings = {
      /* upload post url */
      'url': '',

      /* id of the form wrapping the uploader */
      'form_id': 'uploader_form',

      /* id of the element on the page that will show an upload bar */
      'progressbar_id': 'progress',

      /* the prefix for each div containing information about an 
       * uploading file */
      'upload_prefix' : 'upload_',

      /* maximum filesize amount to be uploaded */
      'limit': 0,

      /* function unsupported_callback() is called when the browser doesn't
       * support file uploads
       */
      'unsupported_callback' : null,

      /* lets you handle progressbar updates on your own 
       * function progress_callback(event, id)
       * event : lets you calculate how much is uploaded
       * id    : get a handle on the element currently displaying the file
       * */
      'progress_callback': null,

      /* called after all uploads complete 
       * function all_complete_callback(settings)
       * settings: the settings object (for accessing aborted etc)
       * */
      'all_complete_callback': null,

      /* called when a new FileList begins to upload 
       * so it is a chance to show a listing of all of the files that will
       * be uploaded (adding remove buttons etc)
       * */
      'populate_display_callback' : null,

      /* called before each individual file upload begins
       * function pre_upload_callback(file, id)
       * file : the file being uploaded -- http://www.w3.org/TR/FileAPI/
       * id   : the id of the element on the page that will hold the files info 
       *        Note: elements should be generated in 'populate_display_callback'
       * */
      'pre_upload_callback': null,

      /* called after each individual file upload ends
       * function post_upload_callback(response, all_complete)
       * headers  : a string representation of all of the response headers
       * response : the json encoded response from the server
       * */
      'post_upload_callback': null,

      /* called when the server returns an error, when xhr fails, or on abort
       * function my_error_callback(object)
       * object : error object [type, status, data]
       * */
      'error_callback': null,

      /////////////////////
      // private objects //
      /////////////////////

      /* are we actually sending */
      'sending' : 0,

      /* tracks aborted indexes for certainty about what the user aborted */
      'aborted' : [],

      /* ajax upload */
      'xhr': null,

      /* internal counter that moves across FileList object. 
       * this starts from zero every time a new upload is initiated
       * */
      'index': - 1,

      /* incremental index used to create unique page ids */
      'display_index': - 1
    };

    var methods = {
      'init': function(options) {
        $.extend(settings, options);

        if(typeof window.FileList === 'undefined') {
          if(this.unsupported_callback) {
            this.unsupported_callback();
            return;
          } else {
            $.error('jQuery.upload not supported in this browser');
            return;
          }  
        }
        if(!this.is("input")) {
          $.error('jQuery.upload must be called on an input');
          return;
        }
        if(!settings.url) {
          $.error('settings.url must be defined');
          return;
        }
        var opt = this.data('upload');
        if(!opt) {
          var $this    = this;
          /* multiple file upload in safari appears to be broken */
          var ua     = navigator.userAgent.toLowerCase();
          var chrome = /chrome/.test(ua);
          var safari = /safari/.test(ua);
          if(safari && !chrome) {
            $this.removeAttr("multiple");
          }
          settings.xhr = new XMLHttpRequest();
          /* the change event triggers new uploading */
          this.bind("change", function() {
            /* uploader internally increments the index for us */
            settings.index = - 1;
            $("#" + settings.progressbar_id).css("width", 0);
            $this.uploader('populate_display').uploader('upload');
          });
          $this.uploader('prepare_xhr', $this, settings);
        }
        this.data('upload', settings);
        return this;
      },
      /* set up the xhr object for processing files */
      'prepare_xhr' : function($this, settings) {
        /* progress bar */
        settings.xhr.upload.addEventListener("progress", function(event) {
          if(settings.progress_callback != null) {
            settings.progress_callback(event, settings.display_index);
            return;
          }
          if(event.lengthComputable) {
            var w = (event.loaded / event.total) * 100;
            $('#' + settings.progressbar_id).css('width', w + "%");
          }
        }, false);

        /* state changes during upload */
        settings.xhr.onreadystatechange = function() {
          if(this.readyState != 4) {
            return;
          }
          if(this.status != 200) {
            if(this.status == 0) {
              /* handle abort */
              error.type = 'xhr';
            } else {
              error.type = 'server';
            }
            error.status = this.status;
            error.data   = settings;
            settings.error_callback(error);
          } else {
            /* upload complete */
            if(this.responseText) {
              var response = eval('(' + this.responseText + ')');
              if(response.status == 'OK') {
                /* handle success */
                var headers = this.getAllResponseHeaders();
                settings.post_upload_callback(headers, response);
              } else {
                /* handle server side errors */
                error.type   = 'server';
                error.status = this.status;
                error.data   = response;
                if(settings.error_callback != null) {
                  settings.error_callback(error);
                }
              }
            }
          }
          /* continue */
          $this.uploader('upload');
        };
      },
      /* calling abort should trigger onreadystatechange with a state of '0' */
      'abort' : function() {
        settings = this.data('upload');
        if(settings.sending > 0) {
          settings.aborted.push(settings.upload_prefix + settings.display_index);
          settings.xhr.abort();
        }
      },
      'populate_display' : function() {
        settings  = this.data('upload');
        if(settings.populate_display_callback == null) {
          return this;
        }
        var files = this.get(0).files;
        for(var i = 1; i <= files.length; i++) {
          var id = settings.upload_prefix + (settings.display_index + i);
          settings.populate_display_callback(id, files[i - 1]);
        }
        return this;
      },
      'upload': function() {
        settings                = this.data('upload');
        settings.sending        = 1;
        settings.index         += 1;
        settings.display_index += 1;
        var file = this.get(0).files[settings.index];
        if(!file) {
          if(!settings.progress_callback != null) {
            $("#" + settings.progressbar_id).css("width", 0);
          }
          settings.all_complete_callback(settings);
          $("#" + settings.form_id).get(0).reset();

          settings.sending = 0;
          this.data('upload', settings);
          return;
        }
        this.data('upload', settings);

        if(settings.pre_upload_callback != null) {
          settings.pre_upload_callback(file, 
            settings.upload_prefix + settings.display_index);
        }
        settings.xhr.open("post", settings.url, true);
        settings.xhr.setRequestHeader("Content-Type", 
          'application/octet-stream; charset=UTF-8');
        if(file.fileName) {
          settings.xhr.setRequestHeader("X-File-Name", file.fileName);
          settings.xhr.setRequestHeader("X-File-Size", file.fileSize);
        } else {
          /* older browsers might use 'name' and 'size' */
          settings.xhr.setRequestHeader("X-File-Name", file.name);
          settings.xhr.setRequestHeader("X-File-Size", file.size);
        }
        settings.xhr.setRequestHeader("X-File-Type", file.type);
        settings.xhr.setRequestHeader("X-Index", settings.index);
        settings.xhr.setRequestHeader("X-Id", 
          settings.upload_prefix + settings.display_index);
        settings.xhr.send(file);
        return this;
      }
    };
    /* Setting up parameters. */
    if(methods[params]) {
      return methods[params].apply(
        this, Array.prototype.slice.call(arguments, 1));
    } else if(typeof params === 'object' || ! params) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + params + ' does not exist in jQuery.uploads');
    }
  }
})(jQuery);

