from django.urls import path

from .views import (
    BusinessProfileView,
    BillingProfileView,
    SystemSettingsLogoUploadView,
    SystemSettingsView,
    WeighingMachineConfigView,
    DataSummaryView,
    DataBackupView,
)

urlpatterns = [
    path("", SystemSettingsView.as_view(), name="system-settings"),
    path("business-profile/", BusinessProfileView.as_view(), name="business-profile"),
    path("billing-profile/", BillingProfileView.as_view(), name="billing-profile"),
    path("logo/", SystemSettingsLogoUploadView.as_view(), name="system-settings-logo-upload"),
    path("weighing-config/", WeighingMachineConfigView.as_view(), name="weighing-machine-config"),
    path("data-summary/", DataSummaryView.as_view(), name="data-summary"),
    path("backup/", DataBackupView.as_view(), name="data-backup"),
]
