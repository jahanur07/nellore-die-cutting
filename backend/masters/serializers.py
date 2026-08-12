from rest_framework import serializers

from .models import DiePrice


# DiePriceSerializer converts DiePrice model instances to/from JSON.
# Used by all die price API views (list, create, update, delete).
class DiePriceSerializer(
    serializers.ModelSerializer
):

    # Show the username of whoever created this record (read-only)
    created_by = serializers.CharField(
        source="created_by.username",
        read_only=True
    )

    class Meta:

        model = DiePrice

        fields = [
            "id",
            "die_code",
            "name",
            "rate",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ]

        # These fields are set automatically and cannot be changed by the user
        read_only_fields = [
            "id",
            "die_code",
            "created_by",
            "created_at",
            "updated_at",
        ]

    # The legacy database field is named `name`, but the client uses it as Die No.
    def validate_name(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Die No. is required."
            )

        return value

    # Validate the rate: must be a positive number
    def validate_rate(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Rate must be greater than zero."
            )

        return value
