from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("settings_app", "0004_alter_systemsettings_token_prefix")]

    operations = [
        migrations.AddField(
            model_name="systemsettings",
            name="allow_token_edit",
            field=models.BooleanField(default=False),
        ),
    ]
