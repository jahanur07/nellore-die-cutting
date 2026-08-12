from django.db import models
from django.contrib.auth.models import User
from customers.models import Customer


class Token(models.Model):

    token_number = models.CharField(
        max_length=30,
        unique=True,
        editable=False
    )

    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="tokens",
        null=True,
        blank=True
    )

    customer_mobile = models.CharField(max_length=15)

    customer_name = models.CharField(
        max_length=150,
        blank=True
    )

    gold_weight = models.DecimalField(
        max_digits=10,
        decimal_places=3
    )

    remarks = models.TextField(blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_tokens"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def save(self, *args, **kwargs):
        if not self.token_number:
            last_token = Token.objects.order_by("-id").first()

            if last_token:
                next_number = last_token.id + 1
            else:
                next_number = 1

            prefix = "TK"
            try:
                from settings_app.models import SystemSettings

                configured = SystemSettings.get_solo().token_prefix.strip().upper()
                if configured:
                    prefix = configured
            except Exception:
                prefix = "TK"

            self.token_number = f"{prefix}{next_number:03d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.token_number
