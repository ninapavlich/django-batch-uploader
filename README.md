# django-batch-uploader
Django batch uploading

#Features

1. Batch upload media files

2. Allow user to specify default values to apply in bulk. For example, if 
you're a photographer uploading multiple images from a single shoot, you may
want to be able to specify that all images to be uploaded are in a single shoot.

3. Allow user to individually edit specific fields. For example, if you're 
uploading a set of images, you may want to add titles from the get go so you
don't have to go back and update them individually.

#Compatibility

1. Django 
2. django-grappelli
3. TODO -- specify supported browser version

#Installation

    pip install django-batch-uploader

##settings.py

    INSTALLED_APPS = (
      ...  
      'django_batch_uploader',    
      ...
    )

##views.py

    from django_batch_uploader.views import BaseBatchUploadView

    class ImageBatchView(BaseBatchUploadView):      
      
        model = Image

        #Same form used in admin.py
        form_class = ImageAddForm

        #Media file name
        media_file_name = 'image'

        #All possible editable fields
        fields = ['title','credit', 'caption', 'alt', 'admin_description', 
            'use_png', 'is_searchable', 'clean_filename_on_upload', 
            'allow_file_to_override', 'creator', 'tags']


        #Which fields can be applied in bulk
        default_fields = ['credit', 'caption', 'admin_description', 'use_png', 
            'is_searchable', 'clean_filename_on_upload', 'allow_file_to_override', 
            'creator', 'tags']

        #Which fields can be applied invididually
        detail_fields = ['title', 'alt', 'credit', 'caption', 'admin_description', 
            'use_png', 'is_searchable', 'clean_filename_on_upload', 
            'allow_file_to_override', 'creator', 'tags']
    

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