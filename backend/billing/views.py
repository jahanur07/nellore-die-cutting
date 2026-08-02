from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter

from .models import Bill
from .serializers import BillSerializer


# Lists all bills and handles creation of new bills.
# GET  /api/billing/  — returns all bills, newest first
# POST /api/billing/  — creates a new bill (gold return + payment)
class BillListCreateView(generics.ListCreateAPIView):

    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]  # Only logged-in staff can access

    # Enables searching bills by bill number, customer name, mobile, or token
    filter_backends = [SearchFilter]

    search_fields = [
        "bill_number",
        "customer__name",
        "customer__mobile",
        "token__token_number",
    ]

    def get_queryset(self):
        # select_related avoids extra DB queries for related fields
        return Bill.objects.select_related(
            "customer",
            "token",
            "created_by",
        ).order_by("-created_at")  # Newest first

    def perform_create(self, serializer):
        # Automatically set created_by to the logged-in staff member
        serializer.save(
            created_by=self.request.user
        )


# Retrieve, update, or delete a single bill by ID.
# GET/PATCH/DELETE /api/billing/<id>/
class BillDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = BillSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bill.objects.select_related(
            "customer",
            "token",
            "created_by",
        )