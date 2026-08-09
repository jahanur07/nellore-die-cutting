from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from rest_framework import serializers

from customers.models import Customer
from .models import Token

class TokenSerializer(serializers.ModelSerializer):

    created_by = serializers.CharField(
        source="created_by.username",
        read_only=True
    )

    customer_code = serializers.CharField(
        source="customer.customer_code",
        read_only=True,
        default=None
    )

    customer_mobile = serializers.CharField(
        required=False,
        allow_blank=True
    )

    total_returned = serializers.SerializerMethodField()
    remaining_gold = serializers.SerializerMethodField()

    class Meta:
        model = Token

        fields = [
            "id",
            "token_number",
            "customer",
            "customer_code",
            "customer_mobile",
            "gold_weight",
            "total_returned",
            "remaining_gold",
            "remarks",
            "created_by",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "token_number",
            "customer_code",
            "created_by",
            "created_at",
        ]

    def get_total_returned(self, obj):
        total = obj.bills.aggregate(
            total=Sum("gold_return")
        )["total"] or Decimal("0.000")

        return f"{total:.3f}"

    def get_remaining_gold(self, obj):
        total = obj.bills.aggregate(
            total=Sum("gold_return")
        )["total"] or Decimal("0.000")

        remaining = obj.gold_weight - total

        return f"{remaining:.3f}"

    def validate(self, attrs):
        customer = attrs.get("customer")
        customer_mobile = attrs.get("customer_mobile", "").strip()

        if customer:
            attrs["customer_mobile"] = customer.mobile
            return attrs

        if not customer_mobile:
            raise serializers.ValidationError(
                {"customer_mobile": "Customer mobile is required."}
            )

        if not customer_mobile.isdigit() or len(customer_mobile) != 10:
            raise serializers.ValidationError(
                {"customer_mobile": "Mobile number must contain exactly 10 digits."}
            )

        attrs["customer_mobile"] = customer_mobile
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        customer = validated_data.get("customer")

        if not customer:
            customer, created = Customer.objects.get_or_create(
                mobile=validated_data["customer_mobile"],
                defaults={
                    "name": "Walk-in Customer",
                    "address": "",
                    "created_by": validated_data["created_by"],
                },
            )

            validated_data["customer"] = customer
            validated_data["customer_mobile"] = customer.mobile

        return super().create(validated_data)