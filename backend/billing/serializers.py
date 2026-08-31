from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from rest_framework import serializers

from .models import Bill, BillItem
from masters.models import DiePrice


# =========================================================
# BILL ITEM SERIALIZER
# =========================================================

class BillItemSerializer(serializers.ModelSerializer):

    die_price = serializers.PrimaryKeyRelatedField(
        # Existing bills must remain editable even if their die/work was
        # later disabled in the master list. New billing still only displays
        # active die/work entries in the frontend.
        queryset=DiePrice.objects.all(),
    )

    class Meta:
        model = BillItem

        fields = [
            "id",
            "die_price",
            "die_code",
            "work_name",
            "rate",
            "quantity",
            "amount",
        ]

        read_only_fields = [
            "id",
            "die_code",
            "work_name",
            "rate",
            "amount",
        ]


# =========================================================
# BILL SERIALIZER
# =========================================================

class BillSerializer(serializers.ModelSerializer):

    created_by = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    customer_name = serializers.CharField(
        source="customer.name",
        read_only=True,
    )

    customer_mobile = serializers.CharField(
        source="customer.mobile",
        read_only=True,
    )

    token_number = serializers.CharField(
        source="token.token_number",
        read_only=True,
    )

    gold_deposit = serializers.DecimalField(
        source="token.gold_weight",
        max_digits=10,
        decimal_places=3,
        read_only=True,
    )

    items = BillItemSerializer(
        many=True,
    )

    class Meta:
        model = Bill

        fields = [
            "id",
            "bill_number",

            "customer",
            "customer_name",
            "customer_mobile",

            "token",
            "token_number",
            "gold_deposit",

            "gold_return",

            "items",

            "total_amount",
            "discount",
            "final_amount",

            "payment_method",
            "remarks",

            "created_by",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "bill_number",

            "customer_name",
            "customer_mobile",

            "token_number",
            "gold_deposit",

            "total_amount",
            "final_amount",

            "created_by",
            "created_at",
        ]


    # =====================================================
    # VALIDATION
    # =====================================================

    def validate(self, attrs):

        customer = attrs.get(
            "customer",
            getattr(
                self.instance,
                "customer",
                None,
            ),
        )

        token = attrs.get(
            "token",
            getattr(
                self.instance,
                "token",
                None,
            ),
        )

        gold_return = attrs.get(
            "gold_return",
            getattr(
                self.instance,
                "gold_return",
                None,
            ),
        )

        discount = attrs.get(
            "discount",
            Decimal("0.00"),
        )

        items = attrs.get(
            "items",
            [],
        )


        # -----------------------------------------
        # Token must belong to customer
        # -----------------------------------------

        if not self.instance and token and Bill.objects.filter(token=token).exists():
            raise serializers.ValidationError({
                "token": "A bill already exists for this token. You can reprint or edit the existing bill."
            })

        if token and customer:

            if token.customer_id != customer.id:

                raise serializers.ValidationError({
                    "token":
                    "This token does not belong to this customer."
                })


        # -----------------------------------------
        # Gold return validation
        # -----------------------------------------

        if gold_return is not None:

            if gold_return <= 0:

                raise serializers.ValidationError({
                    "gold_return":
                    "Gold return must be greater than zero."
                })


        # -----------------------------------------
        # Check remaining gold
        # -----------------------------------------

        if token and gold_return is not None:

            previous_bills = Bill.objects.filter(
                token=token
            )

            if self.instance:

                previous_bills = previous_bills.exclude(
                    pk=self.instance.pk
                )

            total_returned = (
                previous_bills.aggregate(
                    total=Sum("gold_return")
                )["total"]
                or Decimal("0.000")
            )

            remaining_gold = (
                token.gold_weight
                - total_returned
            )

            if gold_return > remaining_gold:

                raise serializers.ValidationError({
                    "gold_return":
                    f"Only {remaining_gold} gm gold is available."
                })


        # -----------------------------------------
        # Bill must contain items
        # -----------------------------------------

        if not self.instance and not items:

            raise serializers.ValidationError({
                "items":
                "Please add at least one Die / Work item."
            })


        # -----------------------------------------
        # Validate quantities
        # -----------------------------------------

        for item in items:

            quantity = item.get(
                "quantity",
                1,
            )

            if quantity <= 0:

                raise serializers.ValidationError({
                    "items":
                    "Item quantity must be greater than zero."
                })


        # -----------------------------------------
        # Discount validation
        # -----------------------------------------

        if discount < 0:

            raise serializers.ValidationError({
                "discount":
                "Discount cannot be negative."
            })


        return attrs


    # =====================================================
    # CREATE BILL
    # =====================================================

    @transaction.atomic
    def create(self, validated_data):

        items_data = validated_data.pop(
            "items"
        )

        discount = validated_data.get(
            "discount",
            Decimal("0.00"),
        )


        # -----------------------------------------
        # Calculate total from MASTER prices
        # -----------------------------------------

        total_amount = Decimal("0.00")

        prepared_items = []


        for item_data in items_data:

            die_price = item_data[
                "die_price"
            ]

            quantity = item_data.get(
                "quantity",
                1,
            )


            # IMPORTANT:
            # Rate comes from Django database,
            # not from React.

            rate = die_price.rate

            item_amount = (
                rate * quantity
            )


            total_amount += item_amount


            prepared_items.append({
                "die_price": die_price,
                "die_code": die_price.die_code,
                "work_name": die_price.name,
                "rate": rate,
                "quantity": quantity,
                "amount": item_amount,
            })


        # -----------------------------------------
        # Discount cannot exceed total
        # -----------------------------------------

        if discount > total_amount:

            raise serializers.ValidationError({
                "discount":
                "Discount cannot be greater than total amount."
            })


        final_amount = (
            total_amount - discount
        )


        # -----------------------------------------
        # Create main bill
        # -----------------------------------------

        bill = Bill.objects.create(
            **validated_data,

            total_amount=total_amount,

            final_amount=final_amount,
        )


        # -----------------------------------------
        # Create all bill items
        # -----------------------------------------

        for item in prepared_items:

            BillItem.objects.create(
                bill=bill,

                die_price=item[
                    "die_price"
                ],

                die_code=item[
                    "die_code"
                ],

                work_name=item[
                    "work_name"
                ],

                rate=item[
                    "rate"
                ],

                quantity=item[
                    "quantity"
                ],

                amount=item[
                    "amount"
                ],
            )


        return bill

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if items_data is None:
            items_data = [
                {"die_price": item.die_price, "quantity": item.quantity}
                for item in instance.items.select_related("die_price")
            ]

        total_amount = Decimal("0.00")
        prepared_items = []

        for item_data in items_data:
            die_price = item_data["die_price"]
            quantity = item_data.get("quantity", 1)
            rate = die_price.rate
            item_amount = rate * quantity
            total_amount += item_amount
            prepared_items.append({
                "die_price": die_price,
                "die_code": die_price.die_code,
                "work_name": die_price.name,
                "rate": rate,
                "quantity": quantity,
                "amount": item_amount,
            })

        discount = instance.discount or Decimal("0.00")
        if discount > total_amount:
            raise serializers.ValidationError({
                "discount": "Discount cannot be greater than total amount."
            })

        instance.total_amount = total_amount
        instance.final_amount = total_amount - discount
        instance.save()

        instance.items.all().delete()
        BillItem.objects.bulk_create([
            BillItem(bill=instance, **item) for item in prepared_items
        ])

        return instance
