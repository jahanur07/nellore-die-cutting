from rest_framework import serializers

from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SystemSettings
        fields = [
            "shop_name",
            "address",
            "phone_number",
            "email",
            "gst_number",
            "business_registration_number",
            "logo",
            "logo_url",
            "financial_year_start",
            "default_payment_mode",
            "currency",
            "weight_unit",
            "weight_decimal_places",
            "amount_decimal_places",
            "show_discount",
            "bill_paper_size",
            "token_paper_size",
            "show_bill_header",
            "show_bill_footer",
            "bill_prefix",
            "token_prefix",
            "low_weight_alert",
            "whatsapp_daily_summary",
            "backup_reminder",
            "bill_print_sound",
            "allow_token_edit",
            "auto_logout_minutes",
            "entries_per_page",
            "theme_mode",
            "language",
            "weighing_machine_enabled",
            "machine_port",
            "machine_baud_rate",
            "machine_parity",
            "machine_data_bits",
            "machine_stop_bits",
            "machine_read_timeout_ms",
            "machine_stable_read_count",
            "allow_manual_weight_entry",
            "updated_at",
        ]
        read_only_fields = ["updated_at", "logo_url"]

    def get_logo_url(self, obj):
        request = self.context.get("request")
        if not obj.logo:
            return ""
        if request:
            return request.build_absolute_uri(obj.logo.url)
        return obj.logo.url

    def validate_shop_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Shop name is required.")
        return value.strip()

    def validate_phone_number(self, value):
        cleaned = value.strip()
        if cleaned and (not cleaned.isdigit() or len(cleaned) < 10 or len(cleaned) > 15):
            raise serializers.ValidationError("Enter a valid phone number.")
        return cleaned

    def validate_bill_prefix(self, value):
        cleaned = value.strip().upper()
        if not cleaned or len(cleaned) > 10:
            raise serializers.ValidationError("Bill prefix must be 1 to 10 characters.")
        if not cleaned.replace("-", "").isalnum():
            raise serializers.ValidationError("Bill prefix supports letters, numbers, and hyphen only.")
        return cleaned

    def validate_token_prefix(self, value):
        cleaned = value.strip().upper()
        if not cleaned or len(cleaned) > 10:
            raise serializers.ValidationError("Token prefix must be 1 to 10 characters.")
        if not cleaned.replace("-", "").isalnum():
            raise serializers.ValidationError("Token prefix supports letters, numbers, and hyphen only.")
        return cleaned

    def validate_weight_decimal_places(self, value):
        if value < 0 or value > 4:
            raise serializers.ValidationError("Weight decimal places must be between 0 and 4.")
        return value

    def validate_amount_decimal_places(self, value):
        if value < 0 or value > 4:
            raise serializers.ValidationError("Amount decimal places must be between 0 and 4.")
        return value

    def validate_machine_port(self, value):
        return value.strip()

    def validate_machine_data_bits(self, value):
        if value not in (7, 8):
            raise serializers.ValidationError("Machine data bits must be 7 or 8.")
        return value

    def validate_machine_stop_bits(self, value):
        if value not in (1, 2):
            raise serializers.ValidationError("Machine stop bits must be 1 or 2.")
        return value

    def validate_machine_read_timeout_ms(self, value):
        if value < 100 or value > 10000:
            raise serializers.ValidationError("Read timeout must be between 100 and 10000 milliseconds.")
        return value

    def validate_machine_stable_read_count(self, value):
        if value < 1 or value > 10:
            raise serializers.ValidationError("Stable read count must be between 1 and 10.")
        return value
