import json
from mimetypes import MimeTypes
import urllib

from django.contrib import admin
from django.contrib.admin.models import LogEntry, ADDITION
from django.contrib.admin.util import flatten_fieldsets
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from django.http import HttpResponse


from .utils import get_media_file_name

class BaseBatchUploadAdmin(admin.ModelAdmin):

  #Add batch_url to context
  #batch_url_name = 'admin_image_batch_view'
  change_list_template = "admin/batch_change_list.html"

  def changelist_view(self, request, extra_context=None):
    extra_context = extra_context or {}

    if hasattr(self, 'batch_url_name'):  
      extra_context['batch_url_name'] = self.batch_url_name
      extra_context['batch_url'] = reverse(self.batch_url_name)

    return super(BaseBatchUploadAdmin, self).changelist_view(request, extra_context=extra_context)


  def add_view(self, request, form_url='', extra_context=None):
    default_response = super(BaseBatchUploadAdmin, self).add_view(request, form_url, extra_context)

    if request.method == 'POST' and "batch" in request.POST:

      response = self.batch_upload_response(request)
      if response != None:
        return response

    return default_response

  def batch_upload_response(self, request):

    output_fields = flatten_fieldsets(self.fieldsets)
    media_file_name = get_media_file_name(self, self.model)

    try:
      latest_log_entry = LogEntry.objects.filter(action_flag=ADDITION).order_by('-action_time')[0]
      ct = ContentType.objects.get_for_id(latest_log_entry.content_type_id)
      obj = ct.get_object_for_this_type(pk=latest_log_entry.object_id)
      if obj:
        
        object_data = {}

        mime = MimeTypes()
        media_file = getattr(obj, media_file_name)
        url = urllib.pathname2url(media_file.url)
        
        mime_type = mime.guess_type(url)
        edit_url = reverse('admin:%s_%s_change' %(obj._meta.app_label,  obj._meta.model_name),  args=[obj.id] )
        data = {
          "files":[
            {
              "url": obj.image_url,
              "edit_url": edit_url,
              "thumbnailUrl": obj.thumbnail_url,
              "name": obj.title,
              "type": mime_type[0],
              "size": obj.image.size
            }
          ]
        }
        return HttpResponse(json.dumps(data), content_type='application/json')
    except:
      return None