import json
import copy
from mimetypes import MimeTypes
import urllib

from django.contrib import admin
from django.contrib.admin.exceptions import DisallowedModelAdminToField
from django.contrib.admin.models import LogEntry, ADDITION
from django.contrib.admin.options import TO_FIELD_VAR
from django.contrib.admin.utils import unquote
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ImproperlyConfigured, PermissionDenied, ValidationError, NON_FIELD_ERRORS
from django.core.urlresolvers import reverse
from django.db.models.fields.related import ManyToManyRel
from django.http import HttpResponse, HttpResponseServerError
from django.template.defaultfilters import capfirst, linebreaksbr
from django.utils import six
from django.utils.encoding import force_text, smart_text
from django.utils.html import conditional_escape, format_html
from django.utils.safestring import mark_safe
from django.utils.translation import ugettext_lazy as _



def get_empty_value_display(cls):
    if hasattr(cls.model_admin, 'get_empty_value_display'):
        return cls.model_admin.get_empty_value_display()
    else:
        # Django < 1.9
        from django.contrib.admin.views.main import EMPTY_CHANGELIST_VALUE
        return EMPTY_CHANGELIST_VALUE


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
        is_batch_upload = request.method == 'POST' and "batch" in request.POST
        response = None

        if is_batch_upload:
            
            errors = []
            errors = self.validate_form(request, form_url, extra_context)
            if errors is None:

                default_response = super(BaseBatchUploadAdmin, self).add_view(request, form_url, extra_context)
                response = self.batch_upload_response(request)
                if response != None:
                    return response
                else:
                    return default_response

            data = {
                "success":False,
                "errors":errors
            }
            json_dumped = json.dumps(data)
            return HttpResponse(json_dumped, content_type='application/json')

        else:
            return super(BaseBatchUploadAdmin, self).add_view(request, form_url, extra_context)


    def validate_form(self, request, form_url, extra_context=None):
        
        to_field = request.POST.get(TO_FIELD_VAR, request.GET.get(TO_FIELD_VAR))

        if to_field and not self.to_field_allowed(request, to_field):
            return {NON_FIELD_ERRORS:"The field %s cannot be referenced." % to_field}

        model = self.model
        opts = model._meta
        add = True

        if not self.has_add_permission(request):
            return {NON_FIELD_ERRORS:"Permission Denied"}
        obj = None

        ModelForm = self.get_form(request, obj)
        form = ModelForm(request.POST, request.FILES, instance=obj)
        valid = form.is_valid()
        if not form.is_valid():
            error_dict = dict(form.errors.items())
            media_file_name = get_media_file_name(self, self.model)
            

            #BEGIN HACK -- Currently a second validation of the newly uploaded file results in a validation error.
            if media_file_name in error_dict:
                delete_indexes = []
                i = 0
                for error in copy.deepcopy(error_dict[media_file_name]):
                    from django.forms.fields import ImageField
                    ignore_validation_error = ImageField.default_error_messages['invalid_image']
                    ignore_validation_error_translated = _(ignore_validation_error)
                    
                    if error == ignore_validation_error or error == ignore_validation_error_translated:
                        error_dict[media_file_name].pop(i)
                    i = i+1

                if len(error_dict[media_file_name]) == 0:
                    del error_dict[media_file_name]

            #Double check error dict after we've manipulated it
            for key in error_dict:
                if len(error_dict[key]) == 0:
                    del error_dict[key]

            if len(error_dict.keys()) == 0:
                error_dict = None
            #END HACK

            return error_dict

        return None

        #If we made it to here with no errors, we're valid.


    def get_field_contents(self, field, obj):
        from django.contrib.admin.templatetags.admin_list import _boolean_icon
        
        model_admin = self

        try:
            f, attr, value = lookup_field(field, obj, self)
        except (AttributeError, ValueError, ObjectDoesNotExist):
            result_repr = get_empty_value_display(self)

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
                    result_repr = display_for_field(value, f, "")
        
        return conditional_escape(result_repr)

    def batch_upload_response(self, request):
        output_fields = flatten_fieldsets(self.fieldsets)
        
        media_file_name = get_media_file_name(self, self.model)


        #Disabling exception handling here @olivierdalang's feedback:
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
                value = str(self.get_field_contents(output_field, obj))
                label = str(label_for_field(output_field, self.model, self))

                field_values[output_field] = {
                    'label':label,
                    'value':value
                }

            object_data['field_values'] = field_values
            

            data = {
                "success":True,
                "files":[
                    object_data
                ]
            }
            json_dumped = json.dumps(data)

            return HttpResponse(json_dumped, content_type='application/json')
        # except Exception as e:
        #   return HttpResponseServerError(e)


