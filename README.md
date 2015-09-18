# django-batch-uploader
Django batch uploading

#Features

1. Users can batch upload files / bulk upload files / upload 
multiple files at one -- however you prefer to phrase it!

2. Users can specify default values to apply in bulk. For example, if 
you're a photographer uploading multiple images from a single shoot, you may
want to be able to tag all the images to a single shoot.

3. Users can individually edit specific fields. For example, if 
you're a photographer uploading multiple images from a single shoot, 
you may want to add titles when you first upload them so you don't 
have to go back and update them individually.

#Compatibility / Requirements

1. Django (last tested with 1.8.2)
2. django-grappelli (last tested with 2.6.5)
3. Chrome, Firefox, Safari, IE10+ (Essentially this list: http://caniuse.com/#feat=input-file-multiple)

#Installation

    pip install django-batch-uploader

##settings.py

    INSTALLED_APPS = (
      ...  
      'django_batch_uploader',    
      ...
    )

##views.py

    from django_batch_uploader.views import AdminBatchUploadView

    class ImageBatchView(AdminBatchUploadView):      
      
        model = Image

        #Media file name
        media_file_name = 'image'
        
        #Which fields can be applied in bulk?
        default_fields = ['credit', 'admin_description', 'creator', 'tags']

        #Which fields can be applied individually?
        detail_fields = ['title', 'alt', 'caption']

        default_values = {}
    

##urls.py
  
    ....
    url( r'admin/media/images/batch/$', ImageBatchView.as_view(), name="admin_image_batch_view"),     
    ....


##admin.py
  
    from django_batch_uploader.admin import BaseBatchUploadAdmin

    class BaseImageAdmin(BaseBatchUploadAdmin):

        batch_url_name = "admin_image_batch_view"

#Screenshots

##Bulk upload button in changelist
![Changelist View](https://raw.github.com/ninapavlich/django-batch-uploader/master/docs/screenshots/changelist_view.png)        

##Select files and specify individual values
![Individual Fields](https://raw.github.com/ninapavlich/django-batch-uploader/master/docs/screenshots/specify_individual_fields.png)        

##Specify defaults to bulk-apply
![Defaults Form](https://raw.github.com/ninapavlich/django-batch-uploader/master/docs/screenshots/specify_bulk_defaults.png)        

##Upload in progress
![Progress](https://raw.github.com/ninapavlich/django-batch-uploader/master/docs/screenshots/see_progress.png)        

##Upload successful
![Progress](https://raw.github.com/ninapavlich/django-batch-uploader/master/docs/screenshots/results.png)        
