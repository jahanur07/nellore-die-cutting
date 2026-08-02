from django.db import models
from django.contrib.auth.models import User


class DiePrice(models.Model):

    die_code = models.CharField(
        max_length=20,
        unique=True,
        editable=False
    )

    name = models.CharField(
        max_length=150,
        unique=True
    )

    rate = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    is_active = models.BooleanField(
        default=True
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_die_prices"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def save(self, *args, **kwargs):

        if not self.die_code:

            last_die = DiePrice.objects.order_by(
                "-id"
            ).first()

            if last_die:
                next_number = last_die.id + 1
            else:
                next_number = 1

            self.die_code = (
                f"DIE-{next_number:04d}"
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.die_code} - "
            f"{self.name} - ₹{self.rate}"
        )