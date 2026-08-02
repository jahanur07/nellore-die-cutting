from django.urls import path

from .views import ReportSummaryView


urlpatterns = [
    path("summary/", ReportSummaryView.as_view(), name="report-summary"),
]
