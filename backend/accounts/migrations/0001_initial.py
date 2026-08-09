# Generated manually for the existing StaffAccount model.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency("auth.User"),
    ]

    operations = [
        migrations.CreateModel(
            name="StaffAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("department", models.CharField(blank=True, max_length=100)),
                ("mpin_hash", models.CharField(blank=True, default="", max_length=128)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to="auth.user")),
            ],
        ),
    ]
