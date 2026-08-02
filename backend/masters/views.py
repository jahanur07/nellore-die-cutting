from rest_framework import generics
from rest_framework.permissions import (
    IsAuthenticated,
    SAFE_METHODS,
)
from rest_framework.filters import SearchFilter

from accounts.permissions import IsSuperuser

from .models import DiePrice
from .serializers import DiePriceSerializer


# Lists all die prices and handles creating new ones.
# GET  /api/masters/die-prices/  — returns all die prices, sorted alphabetically
# POST /api/masters/die-prices/  — creates a new die price entry
class DiePriceListCreateView(
    generics.ListCreateAPIView
):

    serializer_class = DiePriceSerializer
    permission_classes = [IsAuthenticated]

    # Enables searching die prices by die code or name
    filter_backends = [SearchFilter]

    search_fields = [
        "die_code",
        "name",
    ]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsSuperuser()]

    def get_queryset(self):
        # select_related avoids extra DB queries for created_by
        return DiePrice.objects.select_related(
            "created_by"
        ).order_by("name")  # Alphabetical order

    def perform_create(self, serializer):
        # Automatically set created_by to the logged-in staff member
        serializer.save(
            created_by=self.request.user
        )


# Retrieve, update, or delete a single die price by ID.
# GET/PATCH/DELETE /api/masters/die-prices/<id>/
class DiePriceDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = DiePriceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsSuperuser()]

    def get_queryset(self):

        return DiePrice.objects.select_related(
            "created_by"
        )