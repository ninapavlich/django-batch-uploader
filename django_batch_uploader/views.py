from django.contrib.admin import helpers

from django.core.urlresolvers import reverse
from django.views.generic.edit import CreateView

from .utils import get_media_file_name

class BaseBatchUploadView(CreateView):
    template_name = 'batch/base.html'  

    def get_context_data(self, **kwargs):
        context = super(BaseBatchUploadView, self).get_context_data(**kwargs)

        media_file_name = get_media_file_name(self, self.model)

        if not hasattr(self, 'title'):
            self.title = "Batch %s Upload"%(self.model._meta.model_name.capitalize())
       

        if not hasattr(self, 'detail_fields'):
            raise ImproperlyConfigured("Please specify detail_fields this view")
        if not hasattr(self, 'default_fields'):
            raise ImproperlyConfigured("Please specify default_fields this view")

        context['title'] = self.title
        context['media_file_name'] = media_file_name
        context['default_fields'] = self.default_fields
        context['detail_fields'] = self.detail_fields
        context['model_list_url'] = reverse('admin:app_list', kwargs={'app_label': self.model._meta.app_label})
        context['model_app_url'] = reverse('admin:%s_%s_changelist'%(self.model._meta.app_label, self.model._meta.model_name))
        context['model_add_url'] = reverse('admin:%s_%s_add'%(self.model._meta.app_label, self.model._meta.model_name))

        context['adminform'] = adminForm = helpers.AdminForm(
            self.get_form(),
            list(self.get_fieldsets(self.request, None)),
            self.get_prepopulated_fields(self.request, None),
            self.get_readonly_fields(self.request, None),
            model_admin=self
        )
        return context

    
            
    def get_fieldsets(self, request, obj=None):
        return [(None, {'fields': self.fields})]

    def get_prepopulated_fields(self, request, obj=None):
        #Not implemented
        return {}

    def get_readonly_fields(self, request, obj=None):
        #Not implemented
        return [] 