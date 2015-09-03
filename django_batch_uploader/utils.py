from django.core.exceptions import ImproperlyConfigured

def get_media_file_name(cls, model):
        
    #If explicitely labeled
    if hasattr(cls, 'media_file_name'):
        return cls.media_file_name
    
    file_types = []
    for field in model._meta.fields:
        if field.get_internal_type() == "FileField":
            file_types.append(field)

    if len(file_types) == 1:
        return file_types[0].name

    raise ImproperlyConfigured("We detected that there are either \
0 or or more than 1 media file on this model. Please specify 'media_file_name' \
for this view that corresponds to the media file on the %s model. \
For example: media_file_name='image' "%(model._meta.model_name))