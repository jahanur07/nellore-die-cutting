from django.urls import path

from .views import (
    AdminSetupView,
    LoginView,
    AdminDashboardView,
    DashboardView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
)


# URL routes for the accounts app.
# All routes are prefixed with /api/auth/ (set in backend/urls.py)
urlpatterns = [
    # POST /api/auth/login/ — staff login, returns JWT tokens
    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),

    path(
        "admin-setup/",
        AdminSetupView.as_view(),
        name="admin-setup",
    ),

    path(
        "password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),

    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),

    # GET /api/auth/dashboard/ — today's business summary (login required)
    path(
        "dashboard/",
        DashboardView.as_view(),
        name="dashboard"
    ),
    path(
        "admin-dashboard/",
        AdminDashboardView.as_view(),
        name="admin-dashboard"
    ),
]