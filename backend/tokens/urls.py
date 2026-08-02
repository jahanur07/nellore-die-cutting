from django.urls import path

from .views import (
    TokenListCreateView,
    CustomerTokenListView,
    TokenByNumberView,
)


# URL routes for the tokens app.
# All routes are prefixed with /api/tokens/ (set in backend/urls.py)
urlpatterns = [

    # GET  /api/tokens/  — list all tokens
    # POST /api/tokens/  — create a new token (gold deposit)
    path(
        "",
        TokenListCreateView.as_view(),
        name="token-list-create",
    ),

    # GET /api/tokens/customer/<id>/ — list tokens for a specific customer
    path(
        "customer/<int:customer_id>/",
        CustomerTokenListView.as_view(),
        name="customer-token-list",
    ),

    # GET /api/tokens/number/<token_number>/ — find a token and its customer
    path(
        "number/<str:token_number>/",
        TokenByNumberView.as_view(),
        name="token-by-number",
    ),

]