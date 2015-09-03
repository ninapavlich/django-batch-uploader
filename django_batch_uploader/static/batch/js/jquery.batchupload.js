/*!
 * nina@cgpartnersllc.com
 */


;(function ( $, window, document, undefined ) {

    // Create the defaults once
    var pluginName = "batchUpload",
        defaults = {
            propertyName: "value"
        };

    // The actual plugin constructor
    function BatchUpload( element, options ) {
        this.element = element;

        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this._uploadable_items = [];
        this._rendered_uploadable_items = [];

        this._currently_processing_items = [];
        this._rendered_currently_processing_items = [];

        this._failed_items = [];

        this._done_items = [];
        this._rendered_done_items = [];

        this.form_url = null;
        this.form_method = null;

        this.init();
    }

    BatchUpload.prototype = {

        init: function() {
            

            this.renderInit();

            this.addListeners();          

            this.render()
        },
        
        /* Public function */
        // addItems:function(){
        //     console.log("TODO: ADD ITEMS!")
        // },
        // addItem:function(path){
        //     console.log("TODO: ADD ITEM: "+path)
        // },
        startUploads:function(){
            if(this._rendered_uploadable_items.length < 1){
                return;
            }

            var first_item = this._rendered_uploadable_items[0];
            var file = $(first_item).data("file");
            var combined_values = this.getCombinedValues(this.getFormValues(this.defaults_container), this.getFormValues(first_item));

            this.removeUploadableItem(first_item);
            this.addUploadingItem(file, combined_values);

            this.render();

        },
        pauseUploads:function(){
            console.log("TODO: Pause uploads!")
        },
        cancelCurrentUpload:function(){
            this.pauseUploads();

        },
        uploadComplete:function(item, file, data){
            console.log("upload complete: "+item+" "+data)

            this.removeUploadingItem(item);
            this.addDoneItem(file, data);
            this.render();

            this.startUploads();

            
        },
        retryFailedItem:function(item){

        },
        removeFailedItem:function(item){

        },

        /* Internal Functions */
        addListeners: function() {
            //bind events
            var parent = this;

            $(this.add_items_button).bind("click", function(event){
                event.preventDefault();
                parent.addItems();    
            });

            $(this.form_file_input_field).bind("change", function(event){
                parent.processFileSelection();
            });

            $(this.start_uploading_button).bind("click", function(event){
                event.preventDefault();
                parent.startUploads();
            });

            $(this.pause_uploading_button).bind("click", function(event){
                event.preventDefault();
                parent.pauseUploads();
            });

            
        },

        removeListeners: function() {
            //unbind events           
        },
        hasFileInQueue: function(new_file){
            for(var i=0; i < this._uploadable_items.length; i++) {
                var file = this._uploadable_items[i].file;
                if(file.name == new_file.name){
                    return true;
                }
            }
            return false;
        },
        processFileSelection: function(){

            var new_files = this.form_file_input_field.files;
            for(var i=0; i < new_files.length; i++) {
                var file = new_files[i];
                var has_file = this.hasFileInQueue(file);
                if(has_file==false){
                    var uploadable_file = new UploadableItem(file);
                    this.addUploadableItem(uploadable_file);    
                }                
            }
            
            try{
                //http://stackoverflow.com/questions/1703228/how-to-clear-file-input-with-javascript
                this.form_file_input_field.value = '';
                if(this.form_file_input_field.value){
                    this.form_file_input_field.type = "text";
                    this.form_file_input_field.type = "file";
                }
            }catch(e){}

            this.render();

        },
        renderInit: function() {
            var parent = this;

            //Update view
            var container_html = this.renderContainer();
            $(this.element).html(container_html);

            this.batch_container = $(this.element).find(".batch-container")[0];
            this.uploadable_container = $(this.element).find(".uploadable-container")[0];
            this.defaults_container = $(this.element).find(".defaults-container")[0];
            this.current_container = $(this.element).find(".current-container")[0];
            this.failed_container = $(this.element).find(".failed-container")[0];
            this.done_container = $(this.element).find(".done-container")[0];
            this.start_continer = $(this.element).find(".start-container")[0];
            this.results_container = $(this.element).find(".results-container")[0];

            this.original_form = $(this.options.form)[0];
            this.form_url = $(this.original_form).attr("action")
            this.form_method = $(this.original_form).attr("method");
            $(this.original_form).remove();

            var defaults_html = this.renderDefaults();
            $(this.defaults_container).find(".defaults").html(defaults_html);

            this.add_items_button = $(this.element).find("a.add-items")[0];
            this.form_trigger = $(this.element).find("form.trigger")[0];
            this.form_file_input_field = $(this.element).find("input#files")[0]; 
            this.start_uploading_button = $(this.element).find("a.start-uploading")[0];
            this.pause_uploading_button = $(this.element).find("a.pause-uploading")[0];   

            this.uploadable_header_container = $(this.uploadable_container).find(".grp-thead .grp-tr")[0];
            this.current_header_container = $(this.current_container).find(".grp-thead .grp-tr")[0];
            this.failed_header_container = $(this.failed_container).find(".grp-thead .grp-tr")[0];
            this.done_header_container = $(this.done_container).find(".grp-thead .grp-tr")[0];

            this.uploadable_list_container = $(this.uploadable_container).find(".grp-tbody")[0];
            this.current_list_container = $(this.current_container).find(".grp-tbody")[0];
            this.failed_list_container = $(this.failed_container).find(".grp-tbody")[0];
            this.done_list_container = $(this.done_container).find(".grp-tbody")[0];



            this.initUploadableItems();   
            this.initUploadingItems();
            this.initDoneItems();
            this.initFailedItems();

            this.initGrappelliHooks();
            
        },
        render: function() {
            //Update view
            
            if(this._uploadable_items.length > 0){
                $(this.defaults_container).show();
            }else{
                $(this.defaults_container).hide();
            }

            if(this._uploadable_items.length > 0 || this._currently_processing_items.length > 0){
                $(this.start_continer).show();
            }else{
                $(this.start_continer).hide();
            }

            if(this._currently_processing_items.length > 0){
                $(this.current_container).show();
                $(this.start_uploading_button).hide();
                $(this.pause_uploading_button).show();
            }else{
                $(this.current_container).hide();
                $(this.start_uploading_button).show();
                $(this.pause_uploading_button).hide();
            }



            if(this._failed_items.length > 0 || this._done_items.length > 0){
                $(this.results_container).show();
            }else{
                $(this.results_container).hide();
            }

            
        },
        renderContainer: function(){
            return '<div class="batch-container">\
                <div class="uploadable-container">\
                    <h2 style="clear:both;padding:2em 0 0 0;">Step 1. Select Items to Upload</h2>\
                    <div class="items">\
                        <div class="grp-group grp-tabular uploadable-nested-inline nested-inline " id="uploadable-group">\
                            <h2 class="grp-collapse-handler">Items To Upload</h2>\
                            <div class="grp-module grp-table">\
                                <div class="grp-module grp-thead">\
                                    <div class="grp-tr"></div>\
                                </div>\
                                <div class="grp-module grp-tbody">\
                                    <div class="grp-tr"></div>\
                                </div>\
                            </div>\
                        </div>\
                    </div>\
                    <form action="" method="post" enctype="multipart/form-data" class="trigger">\
                        <input name="files[]" id="files" type="file" multiple="" class="grp-button grp-default"/>\
                    </form>\
                    <div class="defaults-container">\
                        <h2 style="clear:both;padding:2em 0 0 0;">Step 2. Apply Default Upload Values</h2>\
                        <fieldset class="grp-module grp-collapse grp-closed ">\
                            <h2 class="grp-collapse-handler">Upload Defaults</h2>\
                            <div class="grp-row"><p>Set the default values of each field for items uploaded in bulk. If an individual value is specified above, then that will override the defaults below.</p></div>\
                            <div class="defaults"></div>\
                        </fieldset>\
                    </div>\
                    <div class="start-container">\
                        <h2 style="clear:both;padding:2em 0 0 0;">Step 3. Begin Upload</h2>\
                        <div style="margin:1em 0;">\
                            <a href="#" class="grp-button grp-default start-uploading">Start Uploading</a>\
                            <a href="#" class="grp-button grp-default pause-uploading">Pause Uploading</a>\
                        </div>\
                    </div>\
                </div>\
                <div class="current-container">\
                    <div class="items">\
                        <div class="grp-group grp-tabular processing-nested-inline nested-inline " id="processing-group">\
                            <h2 class="grp-collapse-handler">Processing</h2>\
                            <div class="grp-module grp-table">\
                                <div class="grp-module grp-thead">\
                                    <div class="grp-tr"></div>\
                                </div>\
                                <div class="grp-module grp-tbody">\
                                    <div class="grp-tr"></div>\
                                </div>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
                <div class="results-container">\
                    <h2 style="clear:both;padding:2em 0 0 0;">Results</h2>\
                    <div class="failed-container">\
                        <div class="items">\
                            <div class="grp-group grp-tabular failed-nested-inline nested-inline " id="failed-group">\
                                <h2 class="grp-collapse-handler">Failed</h2>\
                                <div class="grp-module grp-table">\
                                    <div class="grp-module grp-thead">\
                                        <div class="grp-tr"></div>\
                                    </div>\
                                    <div class="grp-module grp-tbody">\
                                        <div class="grp-tr"></div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>\
                    </div>\
                    <div class="done-container">\
                        <div class="items">\
                            <div class="grp-group grp-tabular done-nested-inline nested-inline " id="done-group">\
                                <h2 class="grp-collapse-handler">Completed Uploads</h2>\
                                <div class="grp-module grp-table">\
                                    <div class="grp-module grp-thead">\
                                        <div class="grp-tr"></div>\
                                    </div>\
                                    <div class="grp-module grp-tbody">\
                                        <div class="grp-tr"></div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>\
                    </div>\
                </div>\
            </div>';
        },
        renderDefaults: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");

            //Remove all fields that aren't explicitely defined in allow_defaults
            $(inputs).each(function(index, item) {
                var is_allowed = parent.options.allow_default_fields.indexOf(item.name) >= 0;
                if(!is_allowed){
                    $(cloned_form).find(".grp-row."+item.name).remove();
                }                
            });

            return $(cloned_form).html();
        },
        initUploadableItems: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");

            var tools_header_html = '<div class="grp-th tools">Tools</div>';
            $(parent.uploadable_header_container).append(tools_header_html);   

            var preview_header_html = '<div class="grp-th preview">Preview</div>';
            $(parent.uploadable_header_container).append(preview_header_html);

            $(inputs).each(function(index, item) {
                var is_allowed = parent.options.allow_detail_fields.indexOf(item.name) >= 0;
                if(is_allowed){
                    var label = $(cloned_form).find(".grp-row."+item.name+" label").text();
                    var header_html = '<div class="grp-th '+item.name+'">'+label+'</div>';
                    $(parent.uploadable_header_container).append(header_html);
                }                
            });
        },
        addUploadableItem: function(file){
            var parent = this;

            //render html
            var html = $('<div class="grp-tr"></div>');

            $(html).data("file", file);

            var tools_html = '<div class="grp-td tools"><ul class="grp-tools" style="top:0px !important;"><li><a href="#" class="grp-delete-handler"></a></li></ul></div>';
            $(html).append(tools_html);      

            var preview_container = $('<div class="grp-td preview"></div>');
            $(preview_container).append(file.preview);
            $(html).append(preview_container);


            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");
            var item_index = this._rendered_uploadable_items.length;
            $(inputs).each(function(index, item) {
                var is_allowed = parent.options.allow_detail_fields.indexOf(item.name) >= 0;
                if(is_allowed){                    
                    var cloned = $(item).clone();
                    $(cloned).attr("id", $(cloned).attr("id").replace("id_", "id_uploadableset-"+item_index+"-"))
                    var cell = $('<div class="grp-td '+item.name+'"></div>');
                    $(cell).html(cloned);
                    var help_text = $(cloned_form).find(".grp-row."+item.name+" .grp-help")
                    $(cell).append(help_text);
                    $(html).append(cell);
                }
            });

            $(this.uploadable_list_container).append(html);
            
            //add listeners
            $(html).find("a.grp-delete-handler").bind("click", function(event){
                event.preventDefault();
                parent.removeUploadableItem(html);                
            });

            //add to _rendered_uploadable_items
            this._uploadable_items.push(file);
            this._rendered_uploadable_items.push(html);

        },
        removeUploadableItem: function(html){
            var parent = this;
            var file = $(html).data("file");

            //Remove Data:
            var index = this._rendered_uploadable_items.indexOf(html);
            if (index > -1) { this._rendered_uploadable_items.splice(index, 1); }

            var index = this._uploadable_items.indexOf(file);
            if (index > -1) { this._uploadable_items.splice(index, 1); }

            //REMOVE LISTENERS
            $(html).find("a.grp-delete-handler").unbind("click");

            //REMOVE MARKUP
            $(html).remove();

        },
        initUploadingItems: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");

            var tools_header_html = '<div class="grp-th tools">Tools</div>';
            $(parent.current_header_container).append(tools_header_html);   

            var preview_header_html = '<div class="grp-th preview">Preview</div>';
            $(parent.current_header_container).append(preview_header_html);

            var values_header_html = '<div class="grp-th values">Values</div>';
            $(parent.current_header_container).append(values_header_html);

            var progress_header_html = '<div class="grp-th progress">Progress</div>';
            $(parent.current_header_container).append(progress_header_html);
           
        },
        addUploadingItem: function(file, data){
            var parent = this;

            
            //render html
            var html = $('<div class="grp-tr"></div>');

            $(html).data("file", file);
            $(html).data("data", data);

            var tools_html = '<div class="grp-td tools"><ul class="grp-tools" style="top:0px !important;"><li><a href="#" class="grp-delete-handler"></a></li></ul></div>';
            $(html).append(tools_html);      

            var preview_container = $('<div class="grp-td preview"></div>');
            $(preview_container).append(file.preview);
            $(html).append(preview_container);

            var values_container = $('<div class="grp-td values"></div>');
            for (key in data) {
                $(values_container).append("<p><strong>"+key+":</strong> "+data[key]+"</p>");
            }
            $(html).append(values_container);      

            var progress_container = $('<div class="grp-td progress"><div class="status-message"></div><div class="progress-indicator"></div></div>');
            var status_message = $(progress_container).find(".status-message")
            var progress_indicator = $(progress_container).find(".progress-indicator")
            $(html).append(progress_container);      
            
            
            $(this.current_list_container).append(html);
            
            //add listeners
            $(html).find("a.grp-delete-handler").bind("click", function(event){
                event.preventDefault();
                console.log("CANCEL!")
                parent.removeUploadingItem(html);                
            });

            $(file).bind(UploadableItem.event_upload_started, function(event){
                console.log('upload started')
                $(status_message).text("Started");
                $(progress_indicator).addClass("loading");
            });

            $(file).bind(UploadableItem.event_upload_progress, function(event, progress){
                console.log('upload progress: '+progress)
                $(status_message).text("In progress");

            });

            $(file).bind(UploadableItem.event_upload_done, function(event, file, data){
                console.log('upload done')
                $(status_message).text("Done");
                $(progress_indicator).removeClass("loading");
                parent.uploadComplete(html, file, data);
            });

            $(file).bind(UploadableItem.event_upload_failed, function(event){
                console.log('upload failed')
                $(status_message).text("Failed");
                $(progress_indicator).removeClass("loading");
                $(progress_indicator).addClass("error");
            });

            file.start_upload(this.form_url, this.form_method, this.options.filename_field, data);

             

            //add to _rendered_uploadable_items
            this._currently_processing_items.push(file);
            this._rendered_currently_processing_items.push(html);
            

        },
        removeUploadingItem: function(html){
            var parent = this;
            var file = $(html).data("file");
            //Remove Data:
            var index = this._rendered_currently_processing_items.indexOf(html);
            console.log("html index> "+index)
            if (index > -1) { this._rendered_currently_processing_items.splice(index, 1); }

            var index = this._currently_processing_items.indexOf(file);
            console.log("file index> "+index)
            if (index > -1) { this._currently_processing_items.splice(index, 1); }

            //REMOVE LISTENERS
            $(html).find("a.grp-delete-handler").unbind("click");

            $(file).unbind(UploadableItem.event_upload_started);
            $(file).unbind(UploadableItem.event_upload_progress);
            $(file).unbind(UploadableItem.event_upload_done);
            $(file).unbind(UploadableItem.event_upload_failed);

            //REMOVE MARKUP
            $(html).remove();

        },
        initDoneItems: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");

            var preview_header_html = '<div class="grp-th preview">Preview</div>';
            $(parent.done_header_container).append(preview_header_html);

            var values_header_html = '<div class="grp-th values">Values</div>';
            $(parent.done_header_container).append(values_header_html);
           
        },
        addDoneItem: function(file, data){
            var parent = this;

            
            //render html
            var html = $('<div class="grp-tr"></div>');

            $(html).data("data", data);
            
            var preview_container = $('<div class="grp-td preview"></div>');
            $(preview_container).append(file.response);
            $(html).append(preview_container);

            var values_container = $('<div class="grp-td values"></div>');
            for (key in data) {
                $(values_container).append("<p><strong>"+key+":</strong> "+data[key]+"</p>");
            }
            $(html).append(values_container);      
            
            $(this.done_list_container).append(html);
            

            //add to _rendered_uploadable_items
            this._rendered_done_items.push(html);
            this._done_items.push(data);

        },
        initFailedItems: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");

            var tools_header_html = '<div class="grp-th tools">Tools</div>';
            $(parent.failed_header_container).append(tools_header_html);   

            var preview_header_html = '<div class="grp-th preview">Preview</div>';
            $(parent.failed_header_container).append(preview_header_html);

            var values_header_html = '<div class="grp-th values">Values</div>';
            $(parent.failed_header_container).append(values_header_html);
           
        },
        getCombinedValues: function(defaults, form_values){
            var combined_values = $.extend( {}, defaults, form_values);

            for (key in defaults) {
                if(combined_values[key] == '' && defaults[key] != ""){
                    console.log("key "+key+' is empty')
                    combined_values[key] = defaults[key];
                }
            }
            return combined_values;
        },
        getFormValues: function(container){
            var output = {};
            
            var inputs = $(container).find(":input");

            //Remove all fields that aren't explicitely defined in allow_defaults
            $(inputs).each(function(index, item) {
                
                if (output[item.name] !== undefined) {
                    if (!output[item.name].push) {
                        output[item.name] = [o[item.name]];
                    }
                    output[item.name].push(item.value || '');
                } else {
                    output[item.name] = item.value || '';
                }
            });

            return output;
        },
        initGrappelliHooks: function(){
            $("#grp-content-container .grp-collapse").grp_collapsible({
                on_init: function(elem, options) {
                    // open collapse (and all collapse parents) in case of errors
                    if (elem.find("ul.errorlist").length > 0) {
                        elem.removeClass("grp-closed")
                            .addClass("grp-open");
                        elem.parents(".grp-collapse")
                            .removeClass("grp-closed")
                            .addClass("grp-open");
                    }
                }
            });
        }
    };

    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName,
                new BatchUpload( this, options ));
            }
        });
    };

})( grp.jQuery, window, document );

//$( document ).ready(function() {
//  $(".selector").pluginName();
//});



var UploadableItem = function(file) {
    
    this.file = file;
    this.path_to_view_item = null;
    this.path_to_preview_item = null;
    this.path_to_edit_item = null;
    this.data = null;
    this.oFReader = new FileReader();
    this.preview = $("<div />");
    this.response = $("<div />");

    this.add_listeners();
    
    this.oFReader.readAsDataURL(file);

    

}
/* STATIC PROPERTIES */
UploadableItem.MAX_HEIGHT = 100;
UploadableItem.event_upload_started     = "event_upload_started";
UploadableItem.event_upload_progress    = "event_upload_progress";
UploadableItem.event_upload_done        = "event_upload_done";
UploadableItem.event_upload_failed      = "event_upload_failed";

UploadableItem.prototype.add_listeners = function(){
    var parent = this;
    $(this.oFReader).bind("load", function (event) {
        var result_src = event.target.result;
        parent.renderNewValue(result_src);
    });
}

UploadableItem.prototype.renderNewValue = function(src){
    var content_type = this.file.type;
    var filename = this.file.name;
    this.renderPreview(src, content_type, filename);
}

UploadableItem.prototype.renderPreview = function(src, content_type, filename){
    var isImage = content_type.indexOf('image') >= 0;
    var pieces = content_type.split("/");
    var content_type_class = pieces.length > 0? 'type-'+pieces[0] : 'type-unknown';            
    var isData = src.indexOf('data:') >= 0;
    
    var preview = null;    

    if(isImage){
        if(isData){                
            preview = $('<div class="preview '+content_type_class+'"><canvas/><p>'+filename+'</p></div>');
        }else{                
            preview = $('<div class="preview '+content_type_class+'"><a href="'+src+'"><canvas/><p>'+filename+'</p></a></div>');
        }

        var canvas = $(preview).find("canvas")[0];
        var image = new Image();

        image.onload = function(){
            if(image.height > UploadableItem.MAX_HEIGHT) {
                image.width *= UploadableItem.MAX_HEIGHT / image.height;
                image.height = UploadableItem.MAX_HEIGHT;
            }
            var ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0, image.width, image.height);
        };
        image.src = src;

    }else if(isData){                
        preview = $('<div class="preview '+content_type_class+'"><p>'+filename+'</p></div>');
    }else{                
        preview = $('<div class="preview '+content_type_class+'"><a href="'+src+'"><p>'+filename+'</p></a></div>');
    }

    $(this.preview).html(preview);

}
UploadableItem.prototype.renderResponse = function(data){
    
    var full_url = data['url'];
    var edit_url = data['edit_url'];
    var content_type = data['type'];
    var isImage = content_type.indexOf('image') >= 0;
    var pieces = content_type.split("/");
    var content_type_class = pieces.length > 0? 'type-'+pieces[0] : 'type-unknown';            
    
    var src = data['thumbnailUrl']
    var url_pieces = src.split("/");
    var filename = url_pieces.length > 0? url_pieces[url_pieces.length-1] : src; 
    
    var preview = null;    

    if(isImage){
        preview = $('<div class="preview '+content_type_class+'"><img style="height:'+UploadableItem.MAX_HEIGHT+'px;" src="'+src+'" /><p><a target="_blank" href="'+full_url+'">'+filename+'</a> - <a target="_blank" href="'+edit_url+'">Edit</a></p></div>');

    }else{                
        preview = $('<div class="preview '+content_type_class+'"><p><a target="_blank" href="'+full_url+'">'+filename+'</a> - <a target="_blank" href="'+edit_url+'">Edit</a></p></div>');
    }

    $(this.response).html(preview);

}
UploadableItem.prototype.start_upload = function(form_url, form_method, filename_field, data){
    var parent = this;
    this.filename_field = filename_field;
    this.form_url = form_url;
    this.form_method = form_method;

    this.data = data;
    this.data[this.filename_field] = this.file;

    var form_data = new FormData();
    for (key in this.data) {
        form_data.append(key, this.data[key]);
    }

    //Notify server to return JSON response
    form_data.append("batch", "True");    

    $.ajax({
        url: this.form_url, 
        type: this.form_method,
        data: form_data,
        contentType: false,
        cache: false,
        processData: false,
        success: function(data) {

            parent.response_data = data['files'][0];
            parent.renderResponse(parent.response_data);

            $(parent).trigger(UploadableItem.event_upload_done, parent, parent.response_data);


        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
            $(parent).trigger(UploadableItem.event_upload_failed);  
        }
    })

    $(this).trigger(UploadableItem.event_upload_started);  
    
}
