from django.contrib import admin

from .models import SystemSettings


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
	list_display = ("shop_name", "default_payment_mode", "updated_at")

	def has_add_permission(self, request):
		return not SystemSettings.objects.exists()
