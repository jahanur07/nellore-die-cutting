from django.urls import path

from .views import (
    BusinessProfileView,
    SystemSettingsLogoUploadView,
    SystemSettingsView,
    WeighingMachineConfigView,
)

urlpatterns = [
    path("", SystemSettingsView.as_view(), name="system-settings"),
    path("business-profile/", BusinessProfileView.as_view(), name="business-profile"),
    path("logo/", SystemSettingsLogoUploadView.as_view(), name="system-settings-logo-upload"),
    path("weighing-config/", WeighingMachineConfigView.as_view(), name="weighing-machine-config"),
]
