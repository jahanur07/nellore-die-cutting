from datetime import timedelta
from decimal import Decimal

from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter

from accounts.permissions import IsSuperuser

from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):

    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [SearchFilter]

    search_fields = [
        "customer_code",
        "name",
        "mobile",
    ]

    def get_queryset(self):
        return Customer.objects.select_related(
            "created_by"
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user
        )


class CustomerSummaryMixin:
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        search_by = request.query_params.get("search_by", "mobile").lower()
        if search_by not in {"mobile", "bill"}:
            search_by = "mobile"

        try:
            page = max(int(request.query_params.get("page", "1")), 1)
        except (TypeError, ValueError):
            page = 1

        try:
            page_size = min(
                max(int(request.query_params.get("page_size", "10")), 1),
                100,
            )
        except (TypeError, ValueError):
            page_size = 10

        customers = Customer.objects.prefetch_related(
            "tokens",
            "bills",
        ).order_by("-created_at")

        cutoff = timezone.now() - timedelta(days=90)
        total_transactions = 0
        total_billing_amount = Decimal("0.00")
        active_customers = 0
        customer_rows = []

        for customer in customers:
            tokens = list(customer.tokens.all())
            bills = list(customer.bills.all())
            transaction_dates = [
                transaction.created_at
                for transaction in [*tokens, *bills]
            ]
            last_visit = max(transaction_dates, default=None)
            billing_amount = sum(
                (bill.final_amount for bill in bills),
                Decimal("0.00"),
            )

            total_transactions += len(tokens) + len(bills)
            total_billing_amount += billing_amount
            if last_visit and last_visit >= cutoff:
                active_customers += 1

            customer_rows.append(
                {
                    "id": customer.id,
                    "customer_code": customer.customer_code,
                    "name": customer.name,
                    "mobile": customer.mobile,
                    "staff_edit_unlocked": customer.staff_edit_unlocked,
                    "total_tokens": len(tokens),
                    "total_bills": len(bills),
                    "total_billing_amount": f"{billing_amount:.2f}",
                    "last_visit": last_visit.isoformat() if last_visit else None,
                    "bill_numbers": [bill.bill_number for bill in bills],
                }
            )

        if search:
            query = search.casefold()
            if search_by == "bill":
                customer_rows = [
                    row
                    for row in customer_rows
                    if any(query in bill_number.casefold() for bill_number in row["bill_numbers"])
                ]
            else:
                customer_rows = [
                    row for row in customer_rows if query in row["mobile"].casefold()
                ]

        for row in customer_rows:
            row.pop("bill_numbers")

        total_results = len(customer_rows)
        total_pages = max((total_results + page_size - 1) // page_size, 1)
        page = min(page, total_pages)
        start_index = (page - 1) * page_size
        end_index = start_index + page_size

        return Response(
            {
                "summary": {
                    "total_customers": customers.count(),
                    "active_customers": active_customers,
                    "total_transactions": total_transactions,
                    "total_billing_amount": f"{total_billing_amount:.2f}",
                },
                "customers": customer_rows[start_index:end_index],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_results": total_results,
                    "total_pages": total_pages,
                },
            }
        )


class AdminCustomerSummaryView(CustomerSummaryMixin, APIView):
    permission_classes = [IsAuthenticated, IsSuperuser]


class StaffCustomerSummaryView(CustomerSummaryMixin, APIView):
    permission_classes = [IsAuthenticated]


class CustomerDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Customer.objects.select_related(
            "created_by"
        )

    def update(self, request, *args, **kwargs):
        customer = self.get_object()

        if (
            not request.user.is_superuser
            and not customer.staff_edit_unlocked
        ):
            return Response(
                {
                    "detail": (
                        "This customer is locked. An administrator must unlock "
                        "customer editing before staff can make changes."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        customer = self.get_object()

        if not request.user.is_superuser:
            return Response(
                {"detail": "Administrator access is required to delete customers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        related_records = []

        if customer.tokens.exists():
            related_records.append("token")
        if customer.bills.exists():
            related_records.append("bill")

        if related_records:
            record_label = " and ".join(related_records)
            return Response(
                {
                    "detail": (
                        f"This customer cannot be deleted because {record_label} "
                        "records already exist. Transaction history must be retained."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            self.perform_destroy(customer)
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "This customer cannot be deleted because transaction "
                        "records already exist."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerStaffEditAccessView(APIView):
    permission_classes = [IsAuthenticated, IsSuperuser]

    def patch(self, request, pk):
        unlocked = request.data.get("staff_edit_unlocked")
        if not isinstance(unlocked, bool):
            return Response(
                {"detail": "staff_edit_unlocked must be a boolean value."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer = get_object_or_404(Customer, pk=pk)
        customer.staff_edit_unlocked = unlocked
        customer.save(update_fields=["staff_edit_unlocked", "updated_at"])

        return Response(CustomerSerializer(customer).data)


class CustomerByMobileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, mobile):

        try:
            customer = Customer.objects.get(
                mobile=mobile
            )

            serializer = CustomerSerializer(customer)

            return Response(serializer.data)

        except Customer.DoesNotExist:
            return Response(
                {
                    "detail": "Customer not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )


class CustomerByIdView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, customer_id):
        try:
            customer = Customer.objects.get(
                customer_code__iexact=customer_id.strip()
            )

            serializer = CustomerSerializer(customer)

            return Response(serializer.data)

        except Customer.DoesNotExist:
            return Response(
                {
                    "detail": "Customer ID not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )