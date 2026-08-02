from django.contrib import admin

# Register your models here.
from django.contrib import admin

from .models import DiePrice


@admin.register(DiePrice)
class DiePriceAdmin(admin.ModelAdmin):

    list_display = (
        "die_code",
        "name",
        "rate",
        "is_active",
        "created_by",
        "updated_at",
    )

    search_fields = (
        "die_code",
        "name",
    )

    list_filter = (
        "is_active",
    )

    ordering = (
        "name",
    )