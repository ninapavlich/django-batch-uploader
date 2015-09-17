from django.core.exceptions import ImproperlyConfigured

def get_media_file_name(cls, model):
        
    #If explicitely labeled
    if hasattr(model, 'media_file_name'):
        return model.media_file_name

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
for this model or view view that corresponds to the media file on the %s model. \
For example: media_file_name='image' "%(model._meta.model_name))


def get_media_file(cls, model, obj):

    try:
        media_file_name = get_media_file_name(cls, model)
            
        #If explicitely labeled
        if hasattr(obj, media_file_name):
            return obj[media_file_name]
    except:
        pass

    if hasattr(obj, 'get_media_file'):
        return obj.get_media_file()

    if hasattr(model, 'get_media_file'):
        return model.get_media_file()

    if hasattr(cls, 'get_media_file'):
        return cls.get_media_file()

    raise ImproperlyConfigured("Either media_file_name or get_media_file not \
implemented on Instance (%s), Model (%s), or View (%s). "%(obj, model, cls))    