from django.urls import path

from .views import (
    AdminCustomerSummaryView,
    StaffCustomerSummaryView,
    CustomerListCreateView,
    CustomerDetailView,
    CustomerStaffEditAccessView,
    CustomerByIdView,
    CustomerByMobileView,
)


# URL routes for the customers app.
# All routes are prefixed with /api/customers/ (set in backend/urls.py)
urlpatterns = [
    # GET /api/customers/admin-summary/ — admin customer transaction dashboard
    path(
        "admin-summary/",
        AdminCustomerSummaryView.as_view(),
        name="admin-customer-summary",
    ),

    # GET /api/customers/staff-summary/ — staff customer overview dashboard
    path(
        "staff-summary/",
        StaffCustomerSummaryView.as_view(),
        name="staff-customer-summary",
    ),

    # PATCH /api/customers/<id>/staff-edit-access/ — admin unlocks staff edits
    path(
        "<int:pk>/staff-edit-access/",
        CustomerStaffEditAccessView.as_view(),
        name="customer-staff-edit-access",
    ),

    # GET  /api/customers/  — list all customers (supports ?search=)
    # POST /api/customers/  — create a new customer
    path(
        "",
        CustomerListCreateView.as_view(),
        name="customer-list-create",
    ),

    # GET /api/customers/mobile/<mobile>/ — look up a customer by mobile number
    path(
        "mobile/<str:mobile>/",
        CustomerByMobileView.as_view(),
        name="customer-by-mobile",
    ),

    # GET /api/customers/customer-id/<customer_id>/ — look up by visible ID
    path(
        "customer-id/<str:customer_id>/",
        CustomerByIdView.as_view(),
        name="customer-by-id",
    ),

    # GET/PATCH/DELETE /api/customers/<id>/ — view, update, or delete a customer
    path(
        "<int:pk>/",
        CustomerDetailView.as_view(),
        name="customer-detail",
    ),
]