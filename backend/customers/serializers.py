from rest_framework import serializers

from .models import Customer


# CustomerSerializer converts Customer model instances to/from JSON.
# Used by all customer API views (list, create, update, delete).
class CustomerSerializer(serializers.ModelSerializer):

    # Show the username of whoever created this record (read-only)
    created_by = serializers.CharField(
        source="created_by.username",
        read_only=True
    )

    class Meta:
        model = Customer

        fields = [
            "id",
            "customer_code",
            "name",
            "mobile",
            "address",
            "staff_edit_unlocked",
            "created_by",
            "created_at",
            "updated_at",
        ]

        # These fields are set automatically and cannot be changed by the user
        read_only_fields = [
            "id",
            "customer_code",
            "staff_edit_unlocked",
            "created_by",
            "created_at",
            "updated_at",
        ]

    # Validate the mobile number: digits only, exactly 10 characters
    def validate_mobile(self, value):
        value = value.strip()

        if not value.isdigit():
            raise serializers.ValidationError(
                "Mobile number must contain only numbers."
            )

        if len(value) != 10:
            raise serializers.ValidationError(
                "Mobile number must contain exactly 10 digits."
            )

        return value

    # Validate the customer name: must be at least 2 characters
    def validate_name(self, value):
        value = value.strip()

        if len(value) < 2:
            raise serializers.ValidationError(
                "Please enter a valid customer name."
            )

        return value