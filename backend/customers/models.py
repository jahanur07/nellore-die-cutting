from django.db import models
from django.contrib.auth.models import User


class Customer(models.Model):
    customer_code = models.CharField(
        max_length=20,
        unique=True,
        editable=False
    )

    name = models.CharField(
        max_length=150
    )

    mobile = models.CharField(
        max_length=15,
        unique=True
    )

    address = models.TextField(
        blank=True
    )

    staff_edit_unlocked = models.BooleanField(
        default=False
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_customers"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def save(self, *args, **kwargs):
        if not self.customer_code:
            last_customer = Customer.objects.order_by("-id").first()

            if last_customer:
                next_number = last_customer.id + 1
            else:
                next_number = 1

            self.customer_code = f"CUS-{next_number:04d}"

        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.customer_code} - {self.name}"