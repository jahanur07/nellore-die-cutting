from django.db import models
from django.contrib.auth.models import User

from customers.models import Customer
from tokens.models import Token


# =========================================================
# BILL
# =========================================================

class Bill(models.Model):

    PAYMENT_METHODS = [
        ("CASH", "Cash"),
        ("ONLINE", "Online"),
    ]

    bill_number = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="bills",
    )

    token = models.ForeignKey(
        Token,
        on_delete=models.PROTECT,
        related_name="bills",
    )

    # Gold returned to customer
    gold_return = models.DecimalField(
        max_digits=10,
        decimal_places=3,
    )

    # Total before discount
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Discount
    discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Final payable amount
    final_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    payment_method = models.CharField(
        max_length=10,
        choices=PAYMENT_METHODS,
        default="CASH",
    )

    remarks = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_bills",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def save(self, *args, **kwargs):

        if not self.bill_number:

            last_bill = (
                Bill.objects
                .order_by("-id")
                .first()
            )

            if last_bill:
                next_number = last_bill.id + 1
            else:
                next_number = 1

            prefix = "BILL"
            try:
                from settings_app.models import SystemSettings

                configured = SystemSettings.get_solo().bill_prefix.strip().upper()
                if configured:
                    prefix = configured
            except Exception:
                prefix = "BILL"

            self.bill_number = f"{prefix}-{next_number:04d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.bill_number


# =========================================================
# BILL ITEM
# =========================================================

class BillItem(models.Model):

    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name="items",
    )

    die_price = models.ForeignKey(
        "masters.DiePrice",
        on_delete=models.PROTECT,
        related_name="bill_items",
    )

    # Snapshot values.
    # These remain unchanged even if Master / Die Price
    # is edited later.

    die_code = models.CharField(
        max_length=50,
    )

    work_name = models.CharField(
        max_length=150,
    )

    rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    quantity = models.PositiveIntegerField(
        default=1,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def save(self, *args, **kwargs):

        # Always calculate amount on backend.
        self.amount = (
            self.rate * self.quantity
        )

        super().save(*args, **kwargs)

    def __str__(self):

        return (
            f"{self.bill.bill_number} - "
            f"{self.die_code}"
        )