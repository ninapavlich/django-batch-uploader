/*!
 * nina@cgpartnersllc.com
 */


;(function ( $, window, document, undefined ) {

    // Create the defaults once
    var pluginName = "batchUpload",
        defaults = {
            'form':'#form-container form',
            'filename_field':'file',
            'allow_default_fields':[],
            'allow_detail_fields':[],
            'render_preview_function':null,
            'render_response_function':null,
            'max_concurrent_uploads':1 //only 1 supported at this point
        };

    // The actual plugin constructor
    function BatchUpload( element, options ) {
        this.element = element;

        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this._has_ever_added_item = false;
        this._uploadable_items = [];
        this._rendered_uploadable_items = [];

        this._currently_processing_items = [];
        this._rendered_currently_processing_items = [];

        this._failed_items = [];
        this._rendered_failed_items = [];

        this._done_items = [];
        this._rendered_done_items = [];

        this.form_url = null;
        this.form_method = null;

        this.going = false;

        this.render_preview_function = this.options['render_preview_function'] || this.renderPreview;
        this.render_response_function = this.options['render_response_function'] || this.renderResponse;

        this.init();
    }

    BatchUpload.prototype = {

        init: function() {
            

            this.renderInit();

            this.addListeners();          

            this.render()
        },

        addSuccessMessage:function(text){
            
            this._addMessage(text, "success", true);

        },
        addWarningMessage:function(text){
            this._addMessage(text, "error", false);            
        },
        _addMessage:function(text, cls, autohide){
            var message =$('<li class="grp-'+cls+'"><ul \
                class="grp-tools"><li><a href="#" class="grp-arrow-up-handler" \
                title="Less"></a></li><li><a href="#" class="grp-arrow-down-handler" \
                title="More"></a></li><li><a href="#" class="grp-delete-handler" \
                title="Cancel Upload"></a></li></ul><div class="inner">'+text+'</div></li>');
            $(this.messages_container).append(message);

            var max_height = 20;
            if($(message).height() > max_height){

                $(message).find("a.grp-arrow-up-handler").hide();
                $(message).css("max-height", max_height+"px");
                $(message).addClass("has-overflow");


                $(message).bind("click", function(event){

                    if($(message).css("max-height")=="none"){
                        $(message).find("a.grp-arrow-down-handler").show();
                        $(message).find("a.grp-arrow-up-handler").hide();
                        $(message).css("max-height", max_height+"px");
                    }else{
                        $(message).find("a.grp-arrow-down-handler").hide();
                        $(message).find("a.grp-arrow-up-handler").show();
                        $(message).css("max-height", "none");
                    }
                    
                });

            }else{
                $(message).find("a.grp-arrow-up-handler").hide();
                $(message).find("a.grp-arrow-down-handler").hide();
            }

            $(message).find("a.grp-delete-handler").bind("click", function(event){
                $(message).slideUp();
            });
            

            if(autohide === true){
                setTimeout(function(){
                    $(message).slideUp();
                }, 10000)
            }
            
        },
        
        /* Public function */
        clearUploadQueue:function(){
            var original_length = this._rendered_uploadable_items.length;
            while(this._rendered_uploadable_items.length > 0){
                var item = this._rendered_uploadable_items[0];    
                this.removeUploadableItem(item);
            }
            this.render();

            this.addSuccessMessage(original_length+" items removed from the upload queue.");
        },
        startUploads:function(){
            
            if(this._rendered_uploadable_items.length < 1){
                this.going = false;
                this.render();
                return;
            }

            if(this._currently_processing_items.length >= this.options.max_concurrent_uploads){
                this.going = true;
                this.render();
                return;
            }
            


            this.going = true;
            

            var first_item = this._rendered_uploadable_items[0];
            var file = $(first_item).data("file");
            var combined_values = this.getCombinedValues(first_item, this.getFormValues(this.defaults_container), this.getFormValues(first_item));

            this.removeUploadableItem(first_item);
            this.addUploadingItem(file, combined_values);

            this.render();

        },
        pauseUploads:function(){
            this.going = false;
            this.render();

            this.addSuccessMessage("The upload queue has paused.");
        },
        uploadComplete:function(item, file, data){
            
            this.removeUploadingItem(item);
            this.addDoneItem(file, data);
            this.render();

            this.addSuccessMessage("The upload process for \
                    "+file.filename+" completed successfully.");

            if(this.going == true){
                this.startUploads();    
            }
        },
        
        uploadFailed:function(item, file, data, status, error){

            this.removeUploadingItem(item);
            this.addFailedItem(file, data);
            this.render();

            this.addWarningMessage("The upload process for \
                    "+file.filename+" failed: "+status+" "+error);

            if(this.going == true){
                this.startUploads();    
            }
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


                if(parent.going == false){
                    parent.startUploads();    
                }
            });

            $(this.clear_queue_button).bind("click", function(event){
                event.preventDefault();
                parent.clearUploadQueue();
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
                    var uploadable_file = new UploadableItem(file, this.render_preview_function, this.render_response_function);
                    this.addUploadableItem(uploadable_file, null);    
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

            this.messages_container = $(document).find("ul.grp-messagelist")[0];

            this.batch_container = $(this.element).find(".batch-container")[0];
            this.uploadable_container = $(this.element).find(".uploadable-container")[0];
            this.defaults_container = $(this.element).find(".defaults-container")[0];
            this.current_container = $(this.element).find(".current-container")[0];
            this.failed_container = $(this.element).find(".failed-container")[0];
            this.done_container = $(this.element).find(".done-container")[0];
            this.start_continer = $(this.element).find(".start-container")[0];
            this.results_container = $(this.element).find(".results-container")[0];
            this.uploadable_items_container = $(this.element).find(".uploadable-container .items")[0];

            this.uploadable_group_header = $(this.element).find("#uploadable-group h2")[0];
            this.processing_group_header = $(this.element).find("#processing-group h2")[0];
            this.failed_group_header = $(this.element).find("#failed-group h2")[0];
            this.done_group_header = $(this.element).find("#done-group h2")[0];

            this.original_form = $(this.options.form)[0];
            this.form_url = $(this.original_form).attr("action")
            this.form_method = $(this.original_form).attr("method");
            $(this.original_form).remove();

            var defaults_html = this.renderDefaults();
            $(this.defaults_container).find(".defaults").html(defaults_html);

            //Apply default values:
            for (var key in this.options.default_values) {
                var value = this.options.default_values[key];
                $(this.defaults_container).find("[name='"+key+"']").val(value);
            }

            this.add_items_button = $(this.element).find("a.add-items")[0];
            this.form_trigger = $(this.element).find("form.trigger")[0];
            this.form_file_input_field = $(this.element).find("input#files")[0]; 
            this.start_uploading_button = $(this.element).find("a.start-uploading")[0];
            this.pause_uploading_button = $(this.element).find("a.pause-uploading")[0];   
            this.clear_queue_button = $(this.element).find("a.clear-queue")[0];

            this.other_browser_label = $(this.element).find("span.others")[0];
            this.ie_label = $(this.element).find("span.ie")[0];

            if(this.getIEVersion()==0){
                $(this.ie_label).hide();
            }else{
                $(this.other_browser_label).hide();
            }

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

            if(this._has_ever_added_item==true){
                $(this.defaults_container).show();
            }else{
                $(this.defaults_container).hide();
            }
            
            if(this._uploadable_items.length > 0){
                $(this.clear_queue_button).show();
                $(this.uploadable_items_container).show();
            }else{
                $(this.clear_queue_button).hide();
                $(this.uploadable_items_container).hide();
            }

            if(this._uploadable_items.length > 0 || this._currently_processing_items.length > 0){
                $(this.start_continer).show();

            }else{
                $(this.start_continer).hide();
            }

            if(this.going == true){
                $(this.start_uploading_button).hide();
                $(this.pause_uploading_button).show();
            }else{
                $(this.start_uploading_button).show();
                $(this.pause_uploading_button).hide();
            }


            if(this._currently_processing_items.length > 0){
                $(this.current_container).show();
            }else{
                $(this.current_container).hide();
            }



            if(this._failed_items.length > 0 || this._done_items.length > 0){
                $(this.results_container).show();
            }else{
                $(this.results_container).hide();
            }

            if(this._failed_items.length > 0){
                $(this.failed_container).show();
            }else{
                $(this.failed_container).hide();
            }

            if(this._done_items.length > 0){
                $(this.done_container).show();
            }else{
                $(this.done_container).hide();
            }

            
        },
        renderContainer: function(){
            return '<div class="batch-container">\
                <div class="uploadable-container">\
                    <h2>1. Select Items to Upload</h2>\
                    <form action="" method="post" enctype="multipart/form-data" class="trigger">\
                        <span class="others">Drop Files Here - or - Click to Upload</span>\
                        <span class="ie">Double-Click to Upload</span>\
                        <input name="files[]" id="files" type="file" multiple="" class="grp-button grp-default"/>\
                        <div class="button-container">\
                            <a href="#" class="grp-button grp-default clear-queue">Clear Upload Queue</a>\
                        </div>\
                    </form>\
                    <div class="defaults-container">\
                        <h2>2. Apply Default Upload Values</h2>\
                        <p class="instructions">Use this section to set the default values of each field for items uploaded in bulk. If an individual value is specified below, then that individual value will override the defaults here.</p>\
                        <fieldset class="grp-module">\
                            <h3 class="grp-collapse-handler">Upload Defaults</h3>\
                            <div class="defaults"></div>\
                        </fieldset>\
                    </div>\
                    <div class="items">\
                        <h2>3. Apply Individual Upload Values</h2>\
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
                    <div class="start-container">\
                        <!--<h2>4. Begin Upload</h2>\
                        <p class="instructions">Click "Start Uploading" to begin uploading. "Pause Uploading" will allow the current item to finish but not process any more items in the queue. To halt an item while uploading, click the (X) button on the left.</p>-->\
                        <div class="button-container">\
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

            var tools_header_html = '<div class="grp-th tools">Remove</div>';
            $(parent.uploadable_header_container).append(tools_header_html);   
        },
        addUploadableItem: function(file, previous_data){
            var parent = this;

            //render html
            var html = $('<div class="grp-tr"></div>');

            $(html).data("file", file);

              

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

            var tools_html = '<div class="grp-td tools"><ul class="grp-tools" \
                style="top:0px !important;"><li><a href="#" \
                class="grp-delete-handler"></a></li></ul></div>';
            $(html).append(tools_html);    

            
            $(this.uploadable_list_container).append(html);

            //Apply default values:
            for (var key in this.options.default_values) {
                var value = this.options.default_values[key];
                $(html).find("[name='"+key+"']").val(value);
            }

            //Apply previous values:
            if(previous_data!=null){
                for (var key in previous_data) {
                    var value = previous_data[key];
                    $(html).find("[name='"+key+"']").val(value);

                    //check box if its a checkbox
                    if(value === "on"){ $(html).find("[name='"+key+"']").attr("checked", true);}
                }   
            }
            
            
            //add listeners
            $(html).find("a.grp-delete-handler").bind("click", function(event){
                event.preventDefault();
                parent.removeUploadableItem(html);  
                parent.render();        
            });

            //add to _rendered_uploadable_items
            this._uploadable_items.push(file);
            this._rendered_uploadable_items.push(html);
            this._has_ever_added_item = true;

            this.updateHeaders();

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

            this.updateHeaders();

        },
        initUploadingItems: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");

            var preview_header_html = '<div class="grp-th preview">Preview</div>';
            $(parent.current_header_container).append(preview_header_html);

            var values_header_html = '<div class="grp-th values">Values</div>';
            $(parent.current_header_container).append(values_header_html);

            var progress_header_html = '<div class="grp-th progress">Loading</div>';
            $(parent.current_header_container).append(progress_header_html);

            var tools_header_html = '<div class="grp-th tools">Halt</div>';
            $(parent.current_header_container).append(tools_header_html);   
           
        },
        addUploadingItem: function(file, data){
            var parent = this;

            
            //render html
            var html = $('<div class="grp-tr"></div>');

            $(html).data("file", file);
            $(html).data("data", data);

                

            var preview_container = $('<div class="grp-td preview"></div>');
            $(preview_container).append(file.preview);
            $(html).append(preview_container);

            var values_container = $('<div class="grp-td values"></div>');
            for (key in data) {
                $(values_container).append("<p><strong>"+key+":</strong> "+data[key]+"</p>");
            }
            $(html).append(values_container);

            var progress_container = $('<div class="grp-td progress">\
                <div class="status-message"></div><div class="progress">\
                <span class="indicator"></span></div></div>');

            var status_message = $(progress_container).find(".status-message")[0];
            var progress_indicator = $(progress_container).find(".progress")[0];
            $(html).append(progress_container);      


            var tools_html = '<div class="grp-td tools"><ul class="grp-tools" \
                style="top:0px !important; float: left;"><li><a href="#" class="grp-delete-handler" \
                title="Cancel Upload"></a></li></ul><p class="grp-help" \
                style="padding-left: 30px;width:80px;">WARNING: \
                Halting an upload mid-way may have unpredictable effects.</p></div>';

            $(html).append(tools_html);  
            
            
            $(this.current_list_container).append(html);
            
            //add listeners
            $(html).find("a.grp-delete-handler").bind("click", function(event){
                event.preventDefault();
                
                file.stop_upload();
                parent.addUploadableItem(file, data);    
                parent.removeUploadingItem(html);   
                parent.going = false;  
                parent.render();           
            });

            $(file).bind(UploadableItem.event_upload_started, function(event){
                $(status_message).text("Started");
                $(progress_indicator).addClass("loading");
            });

         
            $(file).bind(UploadableItem.event_upload_done, function(event, file, data){
                $(status_message).text("Done");
                $(progress_indicator).removeClass("loading");
                $(progress_indicator).addClass("done");
                parent.uploadComplete(html, file, data);

                
            });

            $(file).bind(UploadableItem.event_upload_failed, function(event, status, error){
                $(status_message).text("Failed");
                $(progress_indicator).removeClass("loading");
                $(progress_indicator).addClass("error");

                parent.uploadFailed(html, file, data, status, error);

                
            });

            $(file).bind(UploadableItem.event_upload_cancelled, function(event){
                parent.addWarningMessage("The upload process for \
                    "+file.filename+" was stopped, but there's no way to know \
                    how far it got before stopping.");

                $(status_message).text("Cancelled");
                $(progress_indicator).removeClass("loading");
                $(progress_indicator).addClass("error");

            });

            file.start_upload(this.form_url, this.form_method, this.options.filename_field, data);

             

            //add to _rendered_uploadable_items
            this._currently_processing_items.push(file);
            this._rendered_currently_processing_items.push(html);
            

            this.updateHeaders();

        },
        removeUploadingItem: function(html){
            var parent = this;
            var file = $(html).data("file");
            //Remove Data:
            var index = this._rendered_currently_processing_items.indexOf(html);
            if (index > -1) { this._rendered_currently_processing_items.splice(index, 1); }

            var index = this._currently_processing_items.indexOf(file);
            if (index > -1) { this._currently_processing_items.splice(index, 1); }

            //REMOVE LISTENERS
            $(html).find("a.grp-delete-handler").unbind("click");

            $(file).unbind(UploadableItem.event_upload_started);
            $(file).unbind(UploadableItem.event_upload_done);
            $(file).unbind(UploadableItem.event_upload_failed);
            $(file).unbind(UploadableItem.event_upload_cancelled);

            //REMOVE MARKUP
            $(html).remove();

            this.updateHeaders();

        },
        initDoneItems: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");

            var preview_header_html = '<div class="grp-th preview">Uploaded Items</div>';
            $(parent.done_header_container).append(preview_header_html);
           

            
        },
        addDoneItem: function(file, data){
            var parent = this;

            
            //render html
            var html = $('<div class="grp-tr"></div>');

            $(html).data("data", data);
            
            var preview_container = $('<div class="grp-td preview"></div>');
            $(preview_container).append(file.response);
            $(html).append(preview_container);
  
            
            $(this.done_list_container).append(html);
            

            //add to _rendered_uploadable_items
            this._rendered_done_items.push(html);
            this._done_items.push(data);

            this.updateHeaders();

        },
        initFailedItems: function(){
            var parent = this;
            var cloned_form = $(this.original_form).clone();
            var inputs = $(cloned_form).find(":input");


            var preview_header_html = '<div class="grp-th preview">Preview</div>';
            $(parent.failed_header_container).append(preview_header_html);

            var values_header_html = '<div class="grp-th values">Values</div>';
            $(parent.failed_header_container).append(values_header_html);

            var values_header_html = '<div class="grp-th error">Error</div>';
            $(parent.failed_header_container).append(values_header_html);

            var tools_header_html = '<div class="grp-th tools">Tools</div>';
            $(parent.failed_header_container).append(tools_header_html);   

           
        },
        addFailedItem: function(file, data){
            var parent = this;

            
            //render html
            var html = $('<div class="grp-tr"></div>');

            $(html).data("file", file);

              

            var preview_container = $('<div class="grp-td preview"></div>');
            $(preview_container).append(file.preview);
            $(html).append(preview_container);

            var values_container = $('<div class="grp-td values"></div>');
            for (key in data) {
                $(values_container).append("<p><strong>"+key+":</strong> "+data[key]+"</p>");
            }
            $(html).append(values_container);

            var error_container = $('<div class="grp-td error"><pre>'+file.failed_response+'</pre></div>');
            $(html).append(error_container);    


            var tools_html = '<div class="grp-td tools"><ul class="grp-text-tools" \
                style="top:0px !important; float: left;"><li><a href="#" class="grp-delete-handler" \
                title="Remove Item">Remove</a></li><li><a href="#" class="grp-refresh-handler" \
                title="Retry Item">Retry</a></li></ul></div>';

            $(html).append(tools_html);      

            
            $(this.failed_list_container).append(html);
            
            //add listeners
            $(html).find("a.grp-delete-handler").bind("click", function(event){
                event.preventDefault();
                
                parent.removeFailedItem(html);  
                parent.render();            
            });
            $(html).find("a.grp-refresh-handler").bind("click", function(event){
                event.preventDefault();
                
                parent.removeFailedItem(html); 
                parent.addUploadableItem(file, data);  
                parent.render();     
            });

             

            //add to _rendered_uploadable_items
            this._failed_items.push(file);
            this._rendered_failed_items.push(html);
            
            this.updateHeaders();

        },
        removeFailedItem: function(html){
            var parent = this;
            var file = $(html).data("file");
            //Remove Data:
            var index = this._rendered_failed_items.indexOf(html);
            if (index > -1) { this._rendered_failed_items.splice(index, 1); }

            var index = this._failed_items.indexOf(file);
            if (index > -1) { this._failed_items.splice(index, 1); }

            //REMOVE LISTENERS
            $(html).find("a.grp-delete-handler").unbind("click");
            $(html).find("a.grp-refresh-handler").unbind("click");


            //REMOVE MARKUP
            $(html).remove();

            this.updateHeaders();

        },
        updateHeaders: function(){
            var total = this._uploadable_items.length+this._currently_processing_items.length+this._done_items.length+this._failed_items.length;
            var current = this._currently_processing_items.length+this._done_items.length+this._failed_items.length;
            var item = this._uploadable_items.length > 1? "Items" : "Item";
            $(this.uploadable_group_header).html(this._uploadable_items.length+" "+item+" To Upload");            
            $(this.processing_group_header).html("Processing "+current+" of "+total);
            $(this.done_group_header).html("Completed "+this._done_items.length+" of "+total);
            $(this.failed_group_header).html("Failed "+this._failed_items.length+" of "+total);
        },
        getCombinedValues: function(form_container, defaults, form_values){
            var combined_values = $.extend( {}, defaults, form_values);


            for (key in defaults) {
                if(combined_values[key] == '' && defaults[key] != ""){
                    combined_values[key] = defaults[key];
                }
            }
            // for (key in combined_values) {
            //     console.log("COMBINED: "+key+" = "+combined_values[key]);
            // }

            return combined_values;
        },
        getFormValues: function(container){
            var output = {};
            
            var inputs = $(container).find(":input");

            //Remove all fields that aren't explicitely defined in allow_defaults
            $(inputs).each(function(index, item) {

                
                var value =$(item).val();
                var skip_item = String($(item).attr("type")).toLowerCase() == "checkbox" && item.checked==false;

                
                if( skip_item ){
                    
                    // console.log("skip this un-checked item..."+item.name);
                    //continue

                }else{
                    // console.log($(item).attr("type")+" "+item.name+" = "+value+" "+item.checked);
                
                    if (output[item.name] !== undefined) {
                        if (!output[item.name].push) {
                            output[item.name] = [output[item.name]];
                        }
                        output[item.name].push(value || '');
                    } else {
                        output[item.name] = value || '';
                    } 
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
        },
        renderPreview: function(src, content_type, filename){
            
            var MAX_HEIGHT = 75;
            var isImage = content_type.indexOf('image') >= 0;
            var pieces = content_type.split("/");
            var contentTypeClass = pieces.length > 0? 'type-'+pieces[0] : 'type-unknown';            
            var isData = src.indexOf('data:') >= 0;
            
            var preview = null;    

            if(isImage){
                if(isData){                
                    preview = $('<div class="preview image '+contentTypeClass+'"><p>'+filename+'</p><canvas/><p class="grp-help">Don\'t worry if this preview looks a little distorted, it won\'t look like that when the file is uploaded.</p></div>');
                }else{                
                    preview = $('<div class="preview image '+contentTypeClass+'"><p>'+filename+'</p><a href="'+src+'"><canvas/></a><p class="grp-help">Don\'t worry if this preview looks a little distorted, it won\'t look like that when the file is uploaded.</p></div>');
                }

                var canvas = $(preview).find("canvas")[0];
                var image = new Image();

                image.onload = function(){
                    if(image.height > MAX_HEIGHT) {
                        image.width *= MAX_HEIGHT / image.height;
                        image.height = MAX_HEIGHT;
                    }
                    var ctx = canvas.getContext("2d");
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = image.width;
                    canvas.height = image.height;
                    ctx.drawImage(image, 0, 0, image.width, image.height);
                };
                image.src = src;

            }else if(isData){                
                preview = $('<div class="preview file '+contentTypeClass+'"><p>'+filename+'</p></div>');
            }else{                
                preview = $('<div class="preview file '+contentTypeClass+'"><a href="'+src+'"><p>'+filename+'</p></a></div>');
            }
            return preview
        },
        renderResponse: function(data){
            preview = "";

            for (key in data) {
                preview += "<p><strong>"+key+":</strong> "+data[key]+"</p>";
            }
            
            return preview;
        },
        getIEVersion: function(){
            //http://stackoverflow.com/questions/19999388/check-if-user-is-using-ie-with-jquery
            var ua = window.navigator.userAgent;
            var msie = ua.indexOf("MSIE ");

            if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer, return version number
                return parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)));
            else                 // If another browser, return 0
                return 0

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
BatchUpload = {};
BatchUpload.VERSION = "0.12";
//$( document ).ready(function() {
//  $(".selector").pluginName();
//});



var UploadableItem = function(file, preview_markup_function, response_markup_function) {
    
    this.file = file;
    this.preview_markup_function = preview_markup_function;
    this.response_markup_function = response_markup_function;
    this.path_to_view_item = null;
    this.path_to_preview_item = null;
    this.path_to_edit_item = null;
    this.data = null;
    this.oFReader = new FileReader();
    this.preview = $("<div />");
    this.response = $("<div />");
    this.active_xhr = null;
    this.cancelled = false;
    this.failed_status = null;
    this.failed_response = null;

    this.add_listeners();
    
    this.oFReader.readAsDataURL(file);

    

}
/* STATIC PROPERTIES */

UploadableItem.event_upload_started     = "event_upload_started";
UploadableItem.event_upload_done        = "event_upload_done";
UploadableItem.event_upload_failed      = "event_upload_failed";
UploadableItem.event_upload_cancelled   = "event_upload_cancelled";

UploadableItem.prototype.add_listeners = function(){
    var parent = this;
    $(this.oFReader).bind("load", function (event) {
        var result_src = event.target.result;
        parent.renderNewValue(result_src);
    });
}

UploadableItem.prototype.renderNewValue = function(src){
    this.content_type = this.file.type;
    this.filename = this.file.name;
    this.src = src;

    var preview_html = this.preview_markup_function(src, this.content_type, this.filename);
    $(this.preview).html(preview_html);
}


UploadableItem.prototype.start_upload = function(form_url, form_method, filename_field, data){
    var parent = this;
    this.filename_field = filename_field;
    this.form_url = form_url;
    this.form_method = form_method;
    this.cancelled = false;

    this.data = data;
    this.data[this.filename_field] = this.file;

    var form_data = new FormData();
    for (key in this.data) {
        form_data.append(key, this.data[key]);
    }

    this.failed_status = null;
    this.failed_response = null;
           

    //Notify server to return JSON response
    form_data.append("batch", "True");    

    this.active_xhr = $.ajax({
        url: this.form_url, 
        type: this.form_method,
        data: form_data,
        contentType: false,
        cache: false,
        processData: false,
        success: function(data) {
            parent.completed_xhr = parent.active_xhr;
                        

            success = String(data['success']).toLowerCase()=='true';

            if(success){
                try{
                    parent.response_data = data['files'][0];   
                    
                }catch(e){
                    parent.response_data = {}
                }

                var response_markup = parent.response_markup_function(parent.response_data);
                $(parent.response).html(response_markup);
                $(parent).trigger(UploadableItem.event_upload_done, [parent, parent.response_data]);
            }else{
                var error_status = 400;
                var error_message = parent.renderErrors(data['errors']);

                parent.failed_status = error_status;
                parent.failed_response = error_message;
                $(parent).trigger(UploadableItem.event_upload_failed, [error_status, error_message]);
            }
            

            parent.active_xhr = null;


        },
        error: function (xhr, ajaxOptions, thrownError) {

            if(parent.cancelled ==true){
                return;
            }

            parent.failed_status = xhr.status;
            parent.failed_response = xhr.responseText;

            $(parent).trigger(UploadableItem.event_upload_failed, [xhr.status, '<pre>'+xhr.responseText+'</pre>']);  

            parent.completed_xhr = parent.active_xhr;
            parent.active_xhr = null;

            
        }
    })

    $(this).trigger(UploadableItem.event_upload_started);  
    
}
UploadableItem.prototype.renderErrors = function(errors){
    preview = "";
    for (key in errors) {
        preview += "<p><strong>"+key+":</strong> "+errors[key]+"</p>";
    }
    return preview;
}
UploadableItem.prototype.stop_upload = function(){
    if(this.active_xhr!=null){
        this.cancelled = true;
        this.active_xhr.abort();
        this.active_xhr = null;
        $(this).trigger(UploadableItem.event_upload_cancelled);  
    }

}



