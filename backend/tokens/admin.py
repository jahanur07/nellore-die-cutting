from django.contrib import admin
from .models import Token


@admin.register(Token)
class TokenAdmin(admin.ModelAdmin):

    list_display = (
        "token_number",
        "customer_name",
        "customer_mobile",
        "gold_weight",
        "created_by",
        "created_at",
    )

    search_fields = (
        "token_number",
        "customer_name",
        "customer_mobile",
    )

    ordering = ("-created_at",)