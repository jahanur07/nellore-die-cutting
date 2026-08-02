from django.contrib import admin

from .models import Bill, BillItem


class BillItemInline(admin.TabularInline):
    model = BillItem
    extra = 0
    readonly_fields = (
        "die_code",
        "work_name",
        "rate",
        "quantity",
        "amount",
    )


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):

    list_display = (
        "bill_number",
        "customer",
        "token",
        "gold_return",
        "total_amount",
        "discount",
        "final_amount",
        "payment_method",
        "created_by",
        "created_at",
    )

    list_filter = (
        "payment_method",
        "created_at",
    )

    search_fields = (
        "bill_number",
        "customer__name",
        "customer__mobile",
        "token__token_number",
    )

    readonly_fields = (
        "bill_number",
        "created_at",
    )

    inlines = [
        BillItemInline,
    ]


@admin.register(BillItem)
class BillItemAdmin(admin.ModelAdmin):

    list_display = (
        "bill",
        "die_code",
        "work_name",
        "rate",
        "quantity",
        "amount",
        "created_at",
    )

    search_fields = (
        "bill__bill_number",
        "die_code",
        "work_name",
    )

    list_filter = (
        "created_at",
    )

    readonly_fields = (
        "amount",
        "created_at",
    )