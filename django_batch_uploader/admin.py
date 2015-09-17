import json
from mimetypes import MimeTypes
import urllib

from django.contrib import admin
from django.contrib.admin.models import LogEntry, ADDITION
from django.contrib.admin.util import flatten_fieldsets
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from django.db.models.fields.related import ManyToManyRel
from django.http import HttpResponse
from django.template.defaultfilters import capfirst, linebreaksbr
from django.utils import six
from django.utils.encoding import force_text, smart_text
from django.utils.html import conditional_escape, format_html
from django.utils.safestring import mark_safe


from django.contrib.admin.utils import (
    display_for_field, flatten_fieldsets, help_text_for_field, label_for_field,
    lookup_field,
)


from .utils import get_media_file_name, get_media_file

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

    def get_field_contents(self, field, obj):
        from django.contrib.admin.templatetags.admin_list import _boolean_icon
        from django.contrib.admin.views.main import EMPTY_CHANGELIST_VALUE
        model_admin = self

        try:
            f, attr, value = lookup_field(field, obj, self)
        except (AttributeError, ValueError, ObjectDoesNotExist):
            result_repr = EMPTY_CHANGELIST_VALUE
        else:
            if f is None:
                boolean = getattr(attr, "boolean", False)
                if boolean:
                    result_repr = _boolean_icon(value)
                else:
                    result_repr = smart_text(value)
                    if getattr(attr, "allow_tags", False):
                        result_repr = mark_safe(result_repr)
                    else:
                        result_repr = linebreaksbr(result_repr)
            else:
                if isinstance(f.rel, ManyToManyRel) and value is not None:
                    result_repr = ", ".join(map(six.text_type, value.all()))
                else:
                    result_repr = display_for_field(value, f)
        
        return conditional_escape(result_repr)

    def batch_upload_response(self, request):

        output_fields = flatten_fieldsets(self.fieldsets)
        media_file_name = get_media_file_name(self, self.model)



        # try:
        latest_log_entry = LogEntry.objects.filter(action_flag=ADDITION).order_by('-action_time')[0]
        ct = ContentType.objects.get_for_id(latest_log_entry.content_type_id)
        obj = ct.get_object_for_this_type(pk=latest_log_entry.object_id)
        
        if obj:

            object_data = {}

            mime = MimeTypes()
            media_file = get_media_file(self, self.model, obj)
            media_file_url = media_file.url #urllib.pathname2url(media_file.url) #Not sure why i had this, but it's escaping the URL
            
            mime_type = mime.guess_type(media_file_url)
            edit_url = reverse('admin:%s_%s_change' %(obj._meta.app_label,  obj._meta.model_name),  args=[obj.id] )

            object_data['media_file_url'] = media_file_url
            object_data['media_file_size'] = media_file.size
            object_data['media_file_type'] = mime_type[0]
            object_data['edit_url'] = mark_safe(edit_url)

            field_values = {}


            for output_field in output_fields:
                value = unicode(self.get_field_contents(output_field, obj))
                label = unicode(label_for_field(output_field, self.model, self))

                field_values[output_field] = {
                    'label':label,
                    'value':value
                }

            object_data['field_values'] = field_values

            data = {
                "files":[
                    object_data
                ]
            }
            return HttpResponse(json.dumps(data), content_type='application/json')
        # except:
        #   return None




     
