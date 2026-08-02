from django.urls import path

from .views import (
    DiePriceListCreateView,
    DiePriceDetailView,
)


# URL routes for the masters app.
# All routes are prefixed with /api/masters/ (set in backend/urls.py)
urlpatterns = [

    # GET  /api/masters/die-prices/  — list all die prices (supports ?search=)
    # POST /api/masters/die-prices/  — create a new die price
    path(
        "die-prices/",
        DiePriceListCreateView.as_view(),
        name="die-price-list-create",
    ),

    # GET/PATCH/DELETE /api/masters/die-prices/<id>/ — view, update, or delete
    path(
        "die-prices/<int:pk>/",
        DiePriceDetailView.as_view(),
        name="die-price-detail",
    ),

]