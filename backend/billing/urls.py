from django.urls import path

from .views import (
    BillListCreateView,
    BillDetailView,
)


# URL routes for the billing app.
# All routes are prefixed with /api/billing/ (set in backend/urls.py)
urlpatterns = [

    # GET  /api/billing/  — list all bills
    # POST /api/billing/  — create a new bill (gold return + payment)
    path(
        "",
        BillListCreateView.as_view(),
        name="bill-list-create",
    ),

    # GET/PATCH/DELETE /api/billing/<id>/ — view, update, or delete a bill
    path(
        "<int:pk>/",
        BillDetailView.as_view(),
        name="bill-detail",
    ),

]