from django.db import models


# StaffAccount extends Django's built-in User model.
# Every staff member has a Django User (for login) and a StaffAccount (for extra info).
class StaffAccount(models.Model):
    # One-to-one link: each User can have only one StaffAccount
    user = models.OneToOneField("auth.User", on_delete=models.CASCADE)

    # Optional department field (e.g. "Billing", "Counter")
    department = models.CharField(max_length=100, blank=True)

    # Staff login PIN. Store only a one-way hash, never the plain MPIN.
    mpin_hash = models.CharField(max_length=128, blank=True, default="")

    def __str__(self):
        return self.user.username
