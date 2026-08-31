from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import ProtectedError
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.db.models import Sum

from tokens.models import Token
from billing.models import Bill
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    AdminSetupSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ManagedUserCreateSerializer,
    ManagedUserSerializer,
)
from .models import StaffAccount


def authentication_payload(user):
    refresh = RefreshToken.for_user(user)

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        },
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class LoginView(APIView):

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():

            user = serializer.validated_data["user"]

            return Response(
                {
                    "message": "Login successful",
                    **authentication_payload(user),
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class AdminSetupView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        user_model = get_user_model()
        return Response(
            {"setup_allowed": not user_model.objects.filter(is_superuser=True).exists()}
        )

    def post(self, request):
        user_model = get_user_model()

        with transaction.atomic():
            if user_model.objects.filter(is_superuser=True).exists():
                return Response(
                    {"detail": "An administrator account already exists."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            serializer = AdminSetupSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()

        return Response(
            {
                "message": "Administrator account created.",
                **authentication_payload(user),
            },
            status=status.HTTP_201_CREATED,
        )


class PasswordResetRequestView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = get_user_model().objects.filter(
            email__iexact=serializer.validated_data["email"],
            is_active=True,
        ).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{uid}/{token}"
            )

            try:
                send_mail(
                    "Reset your Nellore Die Cutting password",
                    (
                        "Use the link below to reset your password.\n\n"
                        f"{reset_url}\n\n"
                        "If you did not request this, you can ignore this email."
                    ),
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception:
                return Response(
                    {"detail": "Unable to send a reset email. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "detail": (
                    "If an active account uses this email address, a password reset "
                    "link has been sent."
                )
            }
        )


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"detail": "Your password has been updated."})


class ManagedUserListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _check_admin(self, request):
        return request.user.is_superuser

    def get(self, request):
        if not self._check_admin(request):
            return Response({"detail": "Administrator access is required."}, status=status.HTTP_403_FORBIDDEN)
        users = get_user_model().objects.select_related("staffaccount").order_by("username")
        return Response(ManagedUserSerializer(users, many=True).data)

    def post(self, request):
        if not self._check_admin(request):
            return Response({"detail": "Administrator access is required."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ManagedUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(ManagedUserSerializer(user).data, status=status.HTTP_201_CREATED)


class ManagedUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not request.user.is_superuser:
            return Response({"detail": "Administrator access is required."}, status=status.HTTP_403_FORBIDDEN)
        user_model = get_user_model()
        try:
            user = user_model.objects.select_related("staffaccount").get(pk=pk)
        except user_model.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if "email" in request.data:
            user.email = request.data["email"]
        if "is_active" in request.data:
            user.is_active = bool(request.data["is_active"])
        if "role" in request.data:
            role = str(request.data["role"]).upper()
            if role not in {"ADMIN", "STAFF"}:
                return Response({"detail": "Role must be ADMIN or STAFF."}, status=status.HTTP_400_BAD_REQUEST)
            user.is_staff = role == "ADMIN"
            user.is_superuser = role == "ADMIN"
        user.save()

        staff, _ = StaffAccount.objects.get_or_create(user=user)
        if "department" in request.data:
            staff.department = str(request.data["department"])[:100]
            staff.save(update_fields=["department"])
        if "mpin" in request.data:
            mpin = str(request.data["mpin"])
            if not mpin.isdigit() or len(mpin) != 4:
                return Response({"detail": "MPIN must contain exactly 4 digits."}, status=status.HTTP_400_BAD_REQUEST)
            staff.mpin_hash = make_password(mpin)
            staff.save(update_fields=["mpin_hash"])

        return Response(ManagedUserSerializer(user).data)

    def delete(self, request, pk):
        if not request.user.is_superuser:
            return Response(
                {"detail": "Administrator access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.user.pk == pk:
            return Response(
                {"detail": "You cannot delete your own administrator account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_model = get_user_model()
        try:
            user = user_model.objects.get(pk=pk)
        except user_model.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            user.delete()
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "This user has existing business records and cannot be deleted. "
                        "Deactivate the user instead."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
        
class DashboardView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        today = timezone.localdate()

        today_tokens = Token.objects.filter(
            created_at__date=today
        )

        today_bills = Bill.objects.filter(
            created_at__date=today
        )

        # Today's total gold deposit
        gold_deposit = today_tokens.aggregate(
            total=Sum("gold_weight")
        )["total"] or 0

        # Today's total gold return
        gold_return = today_bills.aggregate(
            total=Sum("gold_return")
        )["total"] or 0

        # Today's total sales
        total_sales = today_bills.aggregate(
            total=Sum("final_amount")
        )["total"] or 0

        # Cash received
        cash_received = today_bills.filter(
            payment_method="CASH"
        ).aggregate(
            total=Sum("final_amount")
        )["total"] or 0

        # Online received
        online_received = today_bills.filter(
            payment_method="ONLINE"
        ).aggregate(
            total=Sum("final_amount")
        )["total"] or 0

        recent_tokens = Token.objects.select_related(
            "customer"
        ).order_by("-created_at")[:5]

        recent_bills = Bill.objects.select_related(
            "customer",
            "token"
        ).order_by("-created_at")[:5]

        transactions = []

        for token in recent_tokens:
            transactions.append({
                "id": f"token-{token.id}",
                "type": "TOKEN",
                "number": token.token_number,
                "mobile": token.customer_mobile,
                "deposit": str(token.gold_weight),
                "returned": None,
                "amount": None,
                "created_at": token.created_at,
            })

        for bill in recent_bills:
            transactions.append({
                "id": f"bill-{bill.id}",
                "type": "BILL",
                "number": bill.bill_number,
                "mobile": bill.customer.mobile,
                "deposit": None,
                "returned": str(bill.gold_return),
                "amount": str(bill.final_amount),
                "created_at": bill.created_at,
            })

        transactions.sort(
            key=lambda item: item["created_at"],
            reverse=True
        )

        transactions = transactions[:5]

        return Response({
            "today_gold_deposit": str(gold_deposit),
            "today_gold_return": str(gold_return),
            "today_sales": str(total_sales),
            "cash_received": str(cash_received),
            "online_received": str(online_received),
            "recent_transactions": transactions,
        })


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_superuser:
            return Response(
                {"detail": "Administrator access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        week_start = today - timedelta(days=6)
        today_tokens = Token.objects.filter(created_at__date=today)
        today_bills = Bill.objects.filter(created_at__date=today)

        gold_deposit = today_tokens.aggregate(total=Sum("gold_weight"))["total"] or Decimal("0.000")
        gold_return = today_bills.aggregate(total=Sum("gold_return"))["total"] or Decimal("0.000")
        sales = today_bills.aggregate(total=Sum("final_amount"))["total"] or Decimal("0.00")
        cash = today_bills.filter(payment_method="CASH").aggregate(total=Sum("final_amount"))["total"] or Decimal("0.00")
        online = today_bills.filter(payment_method="ONLINE").aggregate(total=Sum("final_amount"))["total"] or Decimal("0.00")
        bill_count = today_bills.count()

        weekly_bills = Bill.objects.filter(created_at__date__range=(week_start, today))
        sales_by_date = {
            item["created_at__date"]: item["total"] or Decimal("0.00")
            for item in weekly_bills.values("created_at__date").annotate(total=Sum("final_amount"))
        }
        weekly_sales = [
            {
                "label": (week_start + timedelta(days=offset)).strftime("%d %b"),
                "amount": float(sales_by_date.get(week_start + timedelta(days=offset), Decimal("0.00"))),
            }
            for offset in range(7)
        ]

        transactions = []
        for token in Token.objects.order_by("-created_at")[:5]:
            transactions.append({
                "id": f"token-{token.id}",
                "type": "DEPOSIT",
                "number": token.token_number,
                "weight": str(token.gold_weight),
                "amount": None,
                "created_at": token.created_at,
            })
        for bill in Bill.objects.order_by("-created_at")[:5]:
            transactions.append({
                "id": f"bill-{bill.id}",
                "type": "BILL",
                "number": bill.bill_number,
                "weight": str(bill.gold_return),
                "amount": str(bill.final_amount),
                "created_at": bill.created_at,
            })
        transactions.sort(key=lambda item: item["created_at"], reverse=True)

        return Response({
            "today": {
                "gold_deposit": str(gold_deposit),
                "gold_return": str(gold_return),
                "sales": str(sales),
                "cash": str(cash),
                "online": str(online),
                "bill_count": bill_count,
                "net_weight": str(gold_deposit - gold_return),
                "pending_bills": 0,
                "pending_amount": "0.00",
                "average_bill": str(sales / bill_count if bill_count else Decimal("0.00")),
            },
            "weekly_sales": weekly_sales,
            "recent_transactions": transactions[:5],
        })
