from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):

    list_display = (
        "customer_code",
        "name",
        "mobile",
        "created_by",
        "created_at",
    )

    search_fields = (
        "customer_code",
        "name",
        "mobile",
    )

    ordering = (
        "-created_at",
    )