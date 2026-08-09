from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.db import transaction
from rest_framework import serializers

from .models import StaffAccount


# LoginSerializer validates the username and password sent from the login page.
# It uses Django's built-in authenticate() to check the credentials.
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()

    # write_only=True means the password is never sent back in the response
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    mpin = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate(self, data):
        username = data.get("username")
        password = data.get("password")
        mpin = data.get("mpin")

        if not password and not mpin:
            raise serializers.ValidationError("Enter your password or MPIN.")

        if mpin:
            if not mpin.isdigit() or len(mpin) not in (4, 5, 6):
                raise serializers.ValidationError("MPIN must contain 4 to 6 digits.")

            user = get_user_model().objects.filter(
                username=username,
                is_active=True,
            ).select_related("staff_account").first()
            staff_account = getattr(user, "staff_account", None) if user else None
            if not user or user.is_superuser or not staff_account or not check_password(mpin, staff_account.mpin_hash):
                raise serializers.ValidationError("Invalid staff User ID or MPIN.")
        else:
            user = authenticate(username=username, password=password)

        if user is None:
            raise serializers.ValidationError(
                "Invalid username or password."
            )

        # Prevent disabled accounts from logging in
        if not user.is_active:
            raise serializers.ValidationError(
                "This account is disabled."
            )

        # Attach the user object so the view can access it after validation
        data["user"] = user
        return data


class AdminSetupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, value):
        username = value.strip()
        if get_user_model().objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("This username is already in use.")
        return username

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        user = get_user_model()(username=data["username"], email=data["email"])
        try:
            validate_password(data["password"], user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})

        return data

    def save(self):
        user_model = get_user_model()
        return user_model.objects.create_superuser(
            username=self.validated_data["username"],
            email=self.validated_data["email"],
            password=self.validated_data["password"],
        )


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        try:
            user_id = force_str(urlsafe_base64_decode(data["uid"]))
            user = get_user_model().objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, get_user_model().DoesNotExist):
            raise serializers.ValidationError(
                {"token": "This password reset link is invalid or has expired."}
            )

        if not default_token_generator.check_token(user, data["token"]):
            raise serializers.ValidationError(
                {"token": "This password reset link is invalid or has expired."}
            )

        try:
            validate_password(data["password"], user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})

        data["user"] = user
        return data

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["password"])
        user.save(update_fields=["password"])
        return user


class ManagedUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "role", "department", "is_active", "date_joined"]
        read_only_fields = ["id", "date_joined"]

    def get_role(self, obj):
        return "ADMIN" if obj.is_superuser else "STAFF"

    def get_department(self, obj):
        return getattr(getattr(obj, "staff_account", None), "department", "")


class ManagedUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    mpin = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=["ADMIN", "STAFF"], default="STAFF")
    department = serializers.CharField(required=False, allow_blank=True, max_length=100)

    def validate_username(self, value):
        value = value.strip()
        if get_user_model().objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_mpin(self, value):
        if not value.isdigit() or len(value) not in (4, 5, 6):
            raise serializers.ValidationError("MPIN must contain 4 to 6 digits.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        mpin = validated_data.pop("mpin")
        role = validated_data.pop("role", "STAFF")
        department = validated_data.pop("department", "")
        user_model = get_user_model()
        user = user_model.objects.create_user(**validated_data)
        user.set_unusable_password()
        user.is_staff = role == "ADMIN"
        user.is_superuser = role == "ADMIN"
        user.save(update_fields=["is_staff", "is_superuser"])
        StaffAccount.objects.create(user=user, department=department, mpin_hash=make_password(mpin))
        return user
