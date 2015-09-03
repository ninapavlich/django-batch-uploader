# django-batch-uploader
Django batch uploading


#settings.py

  INSTALLED_APPS = (
    ...  
    'django_batch_uploader',    
    ...
  )

#views.py

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
    

#urls.py
  
  ....
  url( r'admin/media/images/batch/$', ImageBatchView.as_view(), name="admin_image_batch_view"),     
  ....


#admin.py
  
  ....
  url( r'admin/media/images/batch/$', ImageBatchView.as_view(), name="admin_image_batch_view"),     
  ....  